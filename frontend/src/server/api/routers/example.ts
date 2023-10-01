import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { execSync } from "child_process";
import { Client } from "pg";
import * as fs from "fs";
import { OpenAIStream } from "ai";

const getIntrospection = (
  dbUrl: string,
  dbType: "postgres" | "mysql" | "sqlite",
) => {
  if (fs.existsSync("./migrations")) {
    fs.rmdirSync("./migrations", { recursive: true });
  }

  switch (dbType) {
    case "postgres":
      execSync(
        `pnpm drizzle-kit introspect:pg --driver=pg --out=migrations/ --connectionString=${dbUrl}`,
      ).toString();
      break;
    case "mysql":
      execSync(
        `pnpm drizzle-kit introspect:mysql --driver=mysql2 --out=migrations/ --connectionString=${dbUrl}`,
      ).toString();
      break;
  }

  const filename = fs
    .readdirSync("./migrations")
    .find((file) => file.endsWith(".sql"));

  const ddl = fs
    .readFileSync(`./migrations/${filename}`)
    .toString()
    .replace("/*", "")
    .replace("*/", "")
    .split("\n")
    .filter((line) => !line.startsWith("--"))
    .join("\n");

  return ddl;
};

/**
 * pl albo en
 */
const translate =
  "https://761d-2a09-bac5-5085-2dc-00-49-93.ngrok-free.app/translate";

const llama13b =
  "https://761d-2a09-bac5-5085-2dc-00-49-93.ngrok-free.app/process_message";

const codeLLama =
  "https://3d26-2a09-bac1-5bc0-8-00-49-152.ngrok-free.app/fix_sql";

// Create the fetch options
const requestOptions = (requestBody2: {
  user_input: string;
  conversation: string;
  schema: string;
  context: number[] | null;
}) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody2),
});

const translateApi = async ({
  input,
  targetLanguage,
}: {
  input: string;
  targetLanguage: "pl" | "en";
}) => {
  const requestBody = {
    user_input: input,
    target_language: targetLanguage,
  };

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  };

  const response = await fetch(translate, requestOptions);

  return response.text();
};

const columnsMap: Array<{
  translated: string;
  original: string;
}> = [];

const generateCompletion = async ({
  question,
  schema,
}: {
  question: string;
  schema: string;
}) => {
  const endpoint = "http://localhost:11434/api/generate";

  const response = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify({
      model: "sqlcoder",
      prompt: `### Instructions:

      Your task is to convert a question into a SQL query, given a Postgres database schema.
      Adhere to these rules:
      
      - **Deliberately go through the question and database schema word by word** to appropriately answer the question
      - **Use Table Aliases** to prevent ambiguity. For example,\`SELECT table1.col1, table2.col1 FROM table1 JOIN table2 ON table1.id = table2.id\`.
      - When creating a ratio, always cast the numerator as float
      
      ### Input:
      
      Generate a SQL query that answers the question \`${question}\`.
      This query will run on a database whose schema is represented in this string:
      ${schema}
      
      ### Response:
      
      Based on your instructions, here is the SQL query I have generated to answer the question \`${question}\`:
      
      \`\`\`sql
      `,
    }),
  });

  const stream = await new Promise<string>((res, rej) =>
    OpenAIStream(response, {
      onCompletion(completion) {
        res(completion);
      },
    }),
  );

  return stream;
};

// Make the API request

export const exampleRouter = createTRPCRouter({
  introspectDb: publicProcedure
    .input(
      z.object({
        dbUrl: z.string(),
        dbType: z.enum(["postgres", "mysql", "sqlite"]),
      }),
    )
    .mutation(({ input }) => {
      const { dbUrl, dbType } = input;

      const ddl = getIntrospection(dbUrl, dbType);

      return {
        ddl,
      };
    }),
  executeQuery: publicProcedure
    .input(
      z.object({
        dbUrl: z.string(),
        query: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.dbUrl.startsWith("postgres")) {
        const client = new Client({
          connectionString: input.dbUrl,
        });
        await client.connect();

        const result = await client.query({
          text: input.query,
          rowMode: "array",
        });

        await client.end();

        return result;
      }
    }),

  getResponse: publicProcedure
    .input(
      z.object({
        shouldTranslate: z.boolean().default(false),
        user_input: z.string(),
        conversation: z.string(),
        schema: z.string(),
        context: z.array(z.number()).nullable().default(null),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.shouldTranslate) {
        const [user_input, conversation] = await Promise.all([
          translateApi({
            input: input.user_input,
            targetLanguage: "en",
          }),
          input.conversation.length > 10
            ? translateApi({
                input: input.conversation,
                targetLanguage: "en",
              })
            : "",
        ]);

        input.user_input = user_input;
        input.conversation = conversation;
      }

      console.log(JSON.stringify(input, null, 2));

      const columnMatch = input.schema.matchAll(
        /CREATE TABLE.*? \(\s*(.*?)\);/gms,
      );

      if (input.shouldTranslate) {
        for (const match of columnMatch) {
          const columns = match
            .at(1)
            ?.split("\n")
            .map((t) => t.trim())
            .map(
              (t) =>
                t
                  .match(/"(.*?)"/gms)
                  ?.at(0)
                  ?.replaceAll(`"`, ""),
            )
            .filter(Boolean)
            .filter((c) => c && c.length > 4);

          if (!columns) {
            continue;
          }

          const translatedColumns = await Promise.all(
            columns.map(async (c) => ({
              translated: await translateApi({
                input: c!.split("_").join(" "),
                targetLanguage: "en",
              }),
              original: c!,
            })),
          );

          const joined = translatedColumns.map((c) => ({
            ...c,
            translated: c.translated.split(" ").join("_"),
          }));

          joined.forEach((line) => {
            const existingMapping = columnsMap.find(
              (c) => c.original === line.original,
            );
            if (existingMapping) {
              return existingMapping.translated;
            }

            columnsMap.push(line);

            return line.translated;
          });

          columnsMap.forEach((c) => {
            input.schema = input.schema.replaceAll(c.original, c.translated);
            input.user_input = input.user_input.replaceAll(
              c.original,
              c.translated,
            );
          });

          console.log(JSON.stringify(columnsMap, null, 2));
        }
      }

      const data = await fetch(llama13b, requestOptions(input));

      const response = (await data.json()) as {
        message?: string;
        sql_code?: string;
      };

      if (input.shouldTranslate) {
        columnsMap.forEach((c) => {
          response.message = response.message?.replaceAll(
            c.translated,
            c.original,
          );
          response.sql_code = response.sql_code?.replaceAll(
            c.translated,
            c.original,
          );
        });
      }

      return {
        message: response.message,
        sql_code: response.sql_code?.replaceAll("\n", " ").replace(/\s+/g, " "),
      };
    }),
  getResponse2: publicProcedure
    .input(
      z.object({
        shouldTranslate: z.boolean().default(false),
        user_input: z.string(),
        conversation: z.string(),
        schema: z.string(),
        context: z.array(z.number()).nullable().default(null),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.shouldTranslate) {
        const [user_input, conversation] = await Promise.all([
          translateApi({
            input: input.user_input,
            targetLanguage: "en",
          }),
          input.conversation.length > 10
            ? translateApi({
                input: input.conversation,
                targetLanguage: "en",
              })
            : "",
        ]);

        input.user_input = user_input;
        input.conversation = conversation;
      }

      console.log(JSON.stringify(input, null, 2));

      const data = await generateCompletion({
        question: input.user_input,
        schema: input.schema,
      });

      return {
        message: data.split("```").at(1),
        sql_code: data.split("```").at(0),
      };
    }),
});
