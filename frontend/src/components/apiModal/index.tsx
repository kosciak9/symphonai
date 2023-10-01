"use client";
import Card from "@/components/card/Card";
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Link,
  ListItem,
  UnorderedList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { MdLock } from "react-icons/md";

function APIModal(props: { setApiKey: any; sidebar?: boolean }) {
  const { setApiKey, sidebar } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [inputCode, setInputCode] = useState<string>("");

  const textColor = useColorModeValue("navy.700", "white");
  const grayColor = useColorModeValue("gray.500", "gray.500");
  const inputBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputColor = useColorModeValue("navy.700", "white");
  const link = useColorModeValue("brand.500", "white");
  const navbarIcon = useColorModeValue("gray.500", "white");
  const toast = useToast();

  const handleChange = (Event: any) => {
    setInputCode(Event.target.value);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);

    localStorage.setItem("apiKey", value);
  };
  return <></>;
}

export default APIModal;
