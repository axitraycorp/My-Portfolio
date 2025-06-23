// lib/queries/projects.ts
import { gql } from "@apollo/client";

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      title
      description
      techStack
      githubUrl
      liveUrl
      image
      skills {
        skill {
          id
          name
        }
      }
    }
  }
`;
