export interface OrgNode {
  id: string
  name: string
  position: string
  children: OrgNode[]
  isGroup?: boolean
  groupLeaders?: string[] // IDs of members who are group leaders
}

export interface OrgChart {
  id?: string
  name: string
  description?: string
  data: OrgNode
  user_id?: string
  created_at?: string
  updated_at?: string
  groups?: Group[]
}

export interface Group {
  id: string
  name: string
  description?: string
  leaderIds: string[] // IDs of group leaders
  memberIds: string[] // IDs of all members in the group
}
