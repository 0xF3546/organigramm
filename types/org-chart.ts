export interface OrgNode {
  id: string
  name: string
  position: string
  children: OrgNode[]
}

export interface OrgChart {
  id?: string
  name: string
  description?: string
  data: OrgNode
  user_id?: string
  created_at?: string
  updated_at?: string
}
