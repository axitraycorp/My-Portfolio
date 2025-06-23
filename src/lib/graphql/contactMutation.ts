// lib/graphql/contactMutation.ts
import { gql } from "@apollo/client";

export const SEND_CONTACT_MESSAGE = gql`
   mutation SendContactMessage($input: ContactInput!) {
      sendContactMessage(input: $input)
   }
`;
