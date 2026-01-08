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
}

export function OrgChartNode({ node, onAddChild, onEdit, onDelete }: OrgChartNodeProps) {
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <Card className="relative p-4 min-w-[220px] bg-card hover:shadow-lg transition-shadow">
        <div className="space-y-2">
          <div className="font-semibold text-base text-center">{node.name}</div>
          <div className="text-sm text-muted-foreground text-center">{node.position}</div>
        </div>
        <div className="flex gap-1 mt-3 justify-center">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onAddChild(node.id)}
            title="Add subordinate"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(node.id)} title="Edit">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(node.id)} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {hasChildren && (
        <div className="flex flex-col items-center">
          {/* Vertical line from parent to horizontal connector */}
          <div className="w-0.5 h-12 bg-border" />

          {/* Horizontal line connecting all children */}
          {node.children.length > 1 && (
            <div className="relative w-full flex justify-center">
              <div
                className="h-0.5 bg-border absolute"
                style={{
                  width: `${(node.children.length - 1) * 280}px`,
                  top: 0,
                }}
              />
            </div>
          )}

          {/* Children container */}
          <div className="flex gap-8 pt-0">
            {node.children.map((child, index) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Vertical line from horizontal connector to child */}
                <div className="w-0.5 h-12 bg-border" />
                <OrgChartNode node={child} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
