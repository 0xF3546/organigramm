"use client"

import type { OrgNode } from "@/types/org-chart"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Trash2, Edit2 } from "lucide-react"

interface OrgChartNodeProps {
  node: OrgNode
  onAddChild: (parentId: string) => void
  onEdit: (nodeId: string) => void
  onDelete: (nodeId: string) => void
  level: number
}

export function OrgChartNode({ node, onAddChild, onEdit, onDelete, level }: OrgChartNodeProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Card className="relative p-4 min-w-[200px] bg-card hover:shadow-lg transition-shadow">
        <div className="space-y-2">
          <div className="font-semibold text-lg text-center">{node.name}</div>
          <div className="text-sm text-muted-foreground text-center">{node.position}</div>
        </div>
        <div className="flex gap-1 mt-3 justify-center">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAddChild(node.id)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(node.id)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(node.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {node.children && node.children.length > 0 && (
        <>
          <div className="w-0.5 h-8 bg-border" />
          <div className="flex gap-8">
            {node.children.map((child) => (
              <div key={child.id} className="relative">
                {node.children.length > 1 && <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-border" />}
                <OrgChartNode
                  node={child}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  level={level + 1}
                />
              </div>
            ))}
          </div>
          {node.children.length > 1 && (
            <div
              className="absolute h-0.5 bg-border"
              style={{
                width: `calc(100% - ${200 / (level + 1)}px)`,
                top: "calc(100% + 32px)",
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
