"use client"

import { useState } from "react"
import type { OrgNode } from "@/types/org-chart"
import { OrgChartNode } from "./org-chart-node"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileJson, ImageIcon } from "lucide-react"
import html2canvas from "html2canvas"

interface OrgChartEditorProps {
  initialData: OrgNode
  onSave: (data: OrgNode) => void
}

export function OrgChartEditor({ initialData, onSave }: OrgChartEditorProps) {
  const [data, setData] = useState<OrgNode>(initialData)
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [nodeName, setNodeName] = useState("")
  const [nodePosition, setNodePosition] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
  const [parentId, setParentId] = useState<string | null>(null)

  const findNode = (node: OrgNode, id: string): OrgNode | null => {
    if (node.id === id) return node
    for (const child of node.children) {
      const found = findNode(child, id)
      if (found) return found
    }
    return null
  }

  const updateNode = (node: OrgNode, id: string, updates: Partial<OrgNode>): OrgNode => {
    if (node.id === id) {
      return { ...node, ...updates }
    }
    return {
      ...node,
      children: node.children.map((child) => updateNode(child, id, updates)),
    }
  }

  const deleteNode = (node: OrgNode, id: string): OrgNode | null => {
    if (node.id === id) return null
    return {
      ...node,
      children: node.children.map((child) => deleteNode(child, id)).filter((child): child is OrgNode => child !== null),
    }
  }

  const addChild = (node: OrgNode, parentId: string, newChild: OrgNode): OrgNode => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...node.children, newChild],
      }
    }
    return {
      ...node,
      children: node.children.map((child) => addChild(child, parentId, newChild)),
    }
  }

  const handleAddChild = (id: string) => {
    setParentId(id)
    setDialogMode("add")
    setNodeName("")
    setNodePosition("")
    setIsDialogOpen(true)
  }

  const handleEdit = (id: string) => {
    const node = findNode(data, id)
    if (node) {
      setEditingNode(id)
      setNodeName(node.name)
      setNodePosition(node.position)
      setDialogMode("edit")
      setIsDialogOpen(true)
    }
  }

  const handleDelete = (id: string) => {
    if (id === data.id) return
    const updated = deleteNode(data, id)
    if (updated) {
      setData(updated)
      onSave(updated)
    }
  }

  const handleDialogSubmit = () => {
    if (dialogMode === "add" && parentId) {
      const newNode: OrgNode = {
        id: Math.random().toString(36).substring(7),
        name: nodeName,
        position: nodePosition,
        children: [],
      }
      const updated = addChild(data, parentId, newNode)
      setData(updated)
      onSave(updated)
    } else if (dialogMode === "edit" && editingNode) {
      const updated = updateNode(data, editingNode, {
        name: nodeName,
        position: nodePosition,
      })
      setData(updated)
      onSave(updated)
    }
    setIsDialogOpen(false)
  }

  const handleExportJSON = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "organigramm.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportJSON = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string)
            setData(imported)
            onSave(imported)
          } catch (error) {
            alert("Fehler beim Importieren der Datei")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleExportPNG = async () => {
    const element = document.getElementById("org-chart-container")
    if (element) {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
      })
      const url = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = url
      a.download = "organigramm.png"
      a.click()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleImportJSON}>
          <Upload className="mr-2 h-4 w-4" />
          JSON Importieren
        </Button>
        <Button variant="outline" onClick={handleExportJSON}>
          <FileJson className="mr-2 h-4 w-4" />
          Als JSON exportieren
        </Button>
        <Button variant="outline" onClick={handleExportPNG}>
          <ImageIcon className="mr-2 h-4 w-4" />
          Als PNG exportieren
        </Button>
      </div>

      <div id="org-chart-container" className="overflow-auto p-8 bg-background rounded-lg border">
        <div className="flex justify-center min-w-max">
          <OrgChartNode node={data} onAddChild={handleAddChild} onEdit={handleEdit} onDelete={handleDelete} level={0} />
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? "Neues Mitglied hinzufügen" : "Mitglied bearbeiten"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "add"
                ? "Füge ein neues Mitglied zum Organigramm hinzu"
                : "Bearbeite die Informationen des Mitglieds"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="z.B. Max Mustermann"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={nodePosition}
                onChange={(e) => setNodePosition(e.target.value)}
                placeholder="z.B. Server Leitung"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleDialogSubmit}>{dialogMode === "add" ? "Hinzufügen" : "Speichern"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
