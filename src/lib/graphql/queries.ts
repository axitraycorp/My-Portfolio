import { gql } from "@apollo/client";

export const GET_PROJECTS = gql`
   query GetProjects {
      projects {
         id
         title
         description
         githubUrl
         liveUrl
         image
         techStack
         skills {
            skill {
               id
               name
            }
         }
      }
   }
`;
