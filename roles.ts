// Roles for Parasite
interface Role {
  adminAPI: boolean;
  assignableRoles: string[];
  createTorrents: boolean;
  createLists: boolean;
  createComments: boolean;
  deleteOwnTorrents: boolean;
  deleteAnyTorrents: boolean;
  deleteOwnComments: boolean;
  deleteAnyComments: boolean;
  deleteOwnLists: boolean;
  deleteAnyLists: boolean;
  deleteUsers: boolean;
  editUploads: boolean;
  flag: boolean;
  login: boolean;
  manageFederation: boolean;
  vote: boolean;
}

export const roles: Record<string, Role> = {
  "Admin": {
    adminAPI: true,
    assignableRoles: ["Admin", "User", "Banned"],
    createTorrents: true,
    createLists: true,
    createComments: true,
    deleteOwnTorrents: true,
    deleteAnyTorrents: true,
    deleteOwnComments: true,
    deleteAnyComments: true,
    deleteOwnLists: true,
    deleteAnyLists: true,
    deleteUsers: true,
    editUploads: true,
    flag: true,
    login: true,
    manageFederation: true,
    vote: true,
  },
  "User": {
    adminAPI: false,
    assignableRoles: [],
    createTorrents: true,
    createLists: true,
    createComments: true,
    deleteOwnTorrents: true,
    deleteAnyTorrents: false,
    deleteOwnComments: true,
    deleteAnyComments: false,
    deleteOwnLists: true,
    deleteAnyLists: false,
    deleteUsers: false,
    editUploads: true,
    flag: true,
    login: true,
    manageFederation: false,
    vote: true,
  },
  "Banned": {
    adminAPI: false,
    assignableRoles: [],
    createTorrents: false,
    createLists: false,
    createComments: false,
    deleteOwnTorrents: false,
    deleteAnyTorrents: false,
    deleteOwnComments: false,
    deleteAnyComments: false,
    deleteOwnLists: false,
    deleteAnyLists: false,
    deleteUsers: false,
    editUploads: false,
    flag: false,
    login: false,
    manageFederation: false,
    vote: false,
  },
};
