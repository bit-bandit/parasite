// Roles for Parasite
interface Role {
  createTorrents: boolean;
  createLists: boolean;
  createComments: boolean;
  deleteOwnTorrents: boolean;
  deleteOthersTorrents: boolean;
  deleteOwnComments: boolean;
  deleteOthersComments: boolean;
  editUploads: boolean;
  login: boolean;
}

export const roles: Record<string, Role> = {
  "Admin": {
    createTorrents: true,
    createLists: true,
    createComments: true,
    deleteOwnTorrents: true,
    deleteOthersTorrents: true,
    deleteOwnComments: true,
    deleteOthersComments: true,
    vote: true,
    editUploads: true,
    login: true,
  },
  "User": {
    createTorrents: true,
    createLists: true,
    createComments: true,
    deleteOwnTorrents: true,
    deleteOthersTorrents: false,
    deleteOwnComments: true,
    deleteOthersComments: false,
    vote: true,
    editUploads: true,
    login: true,
  },
  "Banned": {
    createTorrents: false,
    createLists: false,
    createComments: false,
    deleteOwnTorrents: false,
    deleteOthersTorrents: false,
    deleteOwnComments: false,
    deleteOthersComments: false,
    vote: false,
    editUploads: false,
    login: false,
  },
};
