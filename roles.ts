// Roles for Parasite
interface Role {
    name: string
    createTorrents: boolean,
    createLists: boolean,
    createComments: boolean,
    deleteOwnTorrents: boolean,
    deleteOthersTorrents: boolean,
    deleteOwnComments: boolean,
    deleteOthersComments: boolean,
    editUploads: boolean,
    login: boolean,
}

export const roles: Role[] = [
  {
    name: "Admin",
    createTorrents: true,
    createLists: true,
    createComments: true,
    deleteOwnTorrents: true,
    deleteOthersTorrents: true,
    deleteOwnComments: true,
    deleteOthersComments: true,
    editUploads: true,
    login: true,
  },
  {
    name: "User",
    createTorrents: true,
    createLists: true,
    createComments: true,
    deleteOwnTorrents: true,
    deleteOthersTorrents: false,
    deleteOwnComments: true,
    deleteOthersComments: false,
    editUploads: true,
    login: true,
  },
  {
    name: "Banned",
    createTorrents: false,
    createLists: false,
    createComments: false,
    deleteOwnTorrents: false,
    deleteOthersTorrents: false,
    deleteOwnComments: false,
    deleteOthersComments: false,
    editUploads: false,
    login: false,
  }
]
