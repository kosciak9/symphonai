"use client";
/*eslint-disable*/

import {
  AbsoluteCenter,
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  Code,
  Divider,
  Editable,
  EditableInput,
  EditablePreview,
  FormLabel,
  HStack,
  Input,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Tfoot,
  Th,
  Thead,
  Tr,
  VStack,
  useSteps,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { api } from "@/utils/api";
import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "@/server/api/root";
import { TRPCClientError } from "@trpc/client";

type RouterOuput = inferRouterOutputs<AppRouter>;

export default function Chat() {
  const [chatHistory, setChatHistory] = useState<
    Array<{
      type: "bot" | "user";
      message?: string;
      data?: RouterOuput["exampleRouter"]["executeQuery"];
    }>
  >([]);
  const [databaseSchema, setDatabaseSchema] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState<string | null>(
    "postgresql://postgres:postgres@localhost:5432/postgres",
  );
  const [input, setInput] = useState("");
  const toast = useToast();
  const generateChat = api.exampleRouter.getResponse.useMutation({
    onSuccess: (data) => {
      setChatHistory([
        ...chatHistory,
        {
          type: "bot",
          message: data.sql_code,
        },
      ]);
    },
    onError: (data) => {
      toast({
        title: "Błąd",
        description: data.message,
        status: "error",
      });
    },
  });
  const { activeStep, goToNext } = useSteps();
  const getDDL = api.exampleRouter.introspectDb.useMutation({
    onSuccess: (data) => {
      setDatabaseSchema(data.ddl);
    },
  });

  const runSQL = api.exampleRouter.executeQuery.useMutation();

  // Loading state
  const [loading, setLoading] = useState<boolean>(false);

  if (activeStep === 0) {
    return (
      <VStack h="100%">
        <Text fontWeight="bold" fontSize="4xl" mx="auto">
          Hello, how does your data look?
        </Text>
        <FormLabel>
          DDL Schema
          <Textarea
            value={databaseSchema}
            onChange={(e) => {
              setDatabaseSchema(e.target.value);
            }}
            placeholder="CREATE TABLE ..."
          />
        </FormLabel>
        <Box position="relative" padding="10" w="100%">
          <Divider />
          <AbsoluteCenter
            bg="AppWorkspace"
            borderRadius={8}
            color="gray"
            px="4"
          >
            OR
          </AbsoluteCenter>
        </Box>
        <FormLabel>
          Database url
          <Input
            value={databaseUrl ?? ""}
            onChange={(e) => {
              setDatabaseUrl(e.target.value);
            }}
            placeholder="postgresql://postgres:postgres@localhost:5432/postgres"
          />
        </FormLabel>
        <Button
          variant="primary"
          onClick={() => {
            if (databaseUrl) {
              getDDL.mutate({
                dbUrl: databaseUrl,
                dbType: databaseUrl.startsWith("postgres")
                  ? "postgres"
                  : "mysql",
              });
            }

            goToNext();
          }}
        >
          Next
        </Button>
      </VStack>
    );
  }

  if (activeStep === 1) {
    return (
      <HStack h="100%">
        <VStack w="100%" h="60vh">
          <VStack w="100%">
            {chatHistory.map((chat, i) => (
              <>
                <Card w="100%">
                  <CardBody>
                    <HStack>
                      <Avatar />
                      {chat.type === "bot" ? (
                        <HStack w="100%" justify="space-between">
                          <Editable
                            w="100%"
                            as={"code"}
                            isDisabled={i !== chatHistory.length - 1}
                            value={chat.message}
                            onChange={(value) => {
                              setChatHistory((prev) => {
                                return prev.map((item, index) => {
                                  if (index === i) {
                                    return {
                                      ...item,
                                      message: value,
                                    };
                                  }

                                  return item;
                                });
                              });
                            }}
                            defaultValue={chat.message}
                          >
                            <EditablePreview />
                            <EditableInput />
                          </Editable>
                          {i === chatHistory.length - 1 ? (
                            <Button
                              variant="primary"
                              onClick={async () => {
                                if (typeof chat.message === "undefined") {
                                  return;
                                }

                                runSQL
                                  .mutateAsync({
                                    dbUrl: databaseUrl!,
                                    query: chat.message,
                                  })
                                  .then((result) => {
                                    if (typeof result !== "undefined") {
                                      setChatHistory((prev) => {
                                        return prev.map((item, index) => {
                                          if (index === i) {
                                            return {
                                              ...item,
                                              data: result,
                                            };
                                          }

                                          return item;
                                        });
                                      });
                                    }
                                  })
                                  .catch((e) => {
                                    if (e instanceof TRPCClientError) {
                                      toast({
                                        title: "Błąd w zapytaniu",
                                        description: e.message,
                                        status: "error",
                                      });
                                    }
                                  });
                              }}
                            >
                              RUN
                            </Button>
                          ) : null}
                        </HStack>
                      ) : (
                        <Text ml={2}>{chat.message}</Text>
                      )}
                    </HStack>
                  </CardBody>
                </Card>
                {typeof chat.data !== "undefined" ? (
                  <TableContainer w="100%" overflowY="scroll" maxH="500px">
                    <Table
                      layout=""
                      overflowY="scroll"
                      h="100%"
                      variant="simple"
                    >
                      <Thead>
                        <Tr>
                          {chat.data.fields.map((field) => (
                            <Th>{field.name}</Th>
                          ))}
                        </Tr>
                      </Thead>
                      <Tbody>
                        {chat.data.rows.map((row) => (
                          <Tr>
                            {row.map((cell) => (
                              <Td>{cell}</Td>
                            ))}
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                ) : null}
              </>
            ))}
          </VStack>
          <HStack mt="auto" w="100%">
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              w="100%"
              bg="white"
              placeholder="Find me..."
            />
            <Button
              onClick={() => {
                generateChat.mutate({
                  conversation: "",
                  schema: databaseSchema,
                  user_input: input,
                });

                setChatHistory([
                  ...chatHistory,
                  {
                    type: "user",
                    message: input,
                  },
                ]);
              }}
              isLoading={generateChat.isLoading}
              variant="primary"
            >
              Submit
            </Button>
          </HStack>
        </VStack>
        <Card
          maxH="60vh"
          h="100%"
          w="40%"
          p={4}
          overflowY="scroll"
          align="flex-start"
          justify="flex-start"
          fontSize="xs"
        >
          {databaseSchema.split("\n").map((line) => (
            <code>{line}</code>
          ))}
        </Card>
      </HStack>
    );
  }
}
