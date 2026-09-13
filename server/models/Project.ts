export interface IProject {
  _id?: string;
  id?: string;
  name: string;
  websites: string[];
  owner?: string;
  owner_id?: string;
  team?: string[];
  createdAt?: Date;
  created_at?: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  websites: string[];
  owner_id: string;
  team: string[];
  created_at: string;
}

export default {
  // Model placeholder
};
