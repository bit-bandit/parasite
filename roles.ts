// Roles for Parasite

// Primary role interface
interface Role {
  // Allows access to the `/a/` endpoint.
  adminAPI: boolean;
  // Roles which the user is permitted to assign other users to  
  assignableRoles: string[];
  // Allows the creation of torrents   
  createTorrents: boolean;
  // Allows the creation of lists  
  createLists: boolean;
  // Allows the creation of comments  
  createComments: boolean;
  // User can delete torrents they have uploaded.  
  deleteOwnTorrents: boolean;
  // User can delete any torrent uploaded by any user.  
  deleteAnyTorrents: boolean;
  // User can delete comments they have uploaded.    
  deleteOwnComments: boolean;
  // User can delete any comment uploaded by any user.
  deleteAnyComments: boolean;
  // User can delete lists they have uploaded.    
  deleteOwnLists: boolean;
  // User can delete any list uploaded by any user.
  deleteAnyLists: boolean;
  // User can remove other users accounts   
  deleteUsers: boolean;
  // User can edit their own uploads
  editUploads: boolean;
  // User can flag local items.
  flag: boolean;
  // User can log in to their account.
  login: boolean;
  // User can manage federations. (IE: Which instances can be blocked/pooled)   
  manageFederation: boolean;
  // User can like/dislike content.  
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
