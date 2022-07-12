// Roles for Parasite
interface Role {
  createTorrents: boolean;
  createLists: boolean;
  createComments: boolean;
  deleteOwnTorrents: boolean;
  deleteOthersTorrents: boolean;
  deleteOwnComments: boolean;
  deleteOthersComments: boolean;
  deleteOwnLists: boolean;
  deleteOthersLists: boolean;
  editUploads: boolean;
  flag: boolean;
  login: boolean;
  vote: boolean;
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
    deleteOwnLists: true,
    deleteOthersLists: true,
    editUploads: true,
    flag: true,
    login: false,
    vote: true,
  },
  "User": {
    createTorrents: true,
    createLists: true,
    createComments: true,
    deleteOwnTorrents: true,
    deleteOthersTorrents: false,
    deleteOwnComments: true,
    deleteOthersComments: false,
    deleteOwnLists: true,
    deleteOthersLists: false,
    editUploads: true,
    flag: true,
    login: false,
    vote: true,
  },
  "Banned": {
    createTorrents: false,
    createLists: false,
    createComments: false,
    deleteOwnTorrents: false,
    deleteOthersTorrents: false,
    deleteOwnComments: false,
    deleteOthersComments: false,
    deleteOwnLists: false,
    deleteOthersLists: false,
    editUploads: false,
    flag: true,
    login: false,
    vote: false,
  },
};
