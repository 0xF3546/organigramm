"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Upload, Trash2, Edit2, FileImage, FileJson, Save, FolderOpen } from "lucide-react"
import { OrgChartNode } from "@/components/org-chart-node"
import type { OrgNode, OrgChart } from "@/types/org-chart"
import html2canvas from "html2canvas"

export default function HomePage() {
  const [orgCharts, setOrgCharts] = useState<OrgChart[]>([])
  const [currentChart, setCurrentChart] = useState<OrgChart | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingNode, setEditingNode] = useState<{ id: string; name: string; position: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [chartName, setChartName] = useState("")
  const [chartDescription, setChartDescription] = useState("")
  const chartRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadOrgCharts()
  }, [])

  const loadOrgCharts = async () => {
    const { data } = await supabase.from("org_charts").select("*").order("updated_at", { ascending: false })
    if (data) {
      setOrgCharts(data as OrgChart[])
    }
  }

  const createNewChart = () => {
    const newChart: OrgChart = {
      name: chartName || "Neues Organigramm",
      description: chartDescription,
      data: {
        id: crypto.randomUUID(),
        name: "CEO",
        position: "Geschäftsführung",
        children: [],
      },
    }
    setCurrentChart(newChart)
    setIsEditing(true)
    setShowDialog(false)
    setChartName("")
    setChartDescription("")
  }

  const loadChart = (chart: OrgChart) => {
    setCurrentChart(chart)
    setIsEditing(true)
  }

  const saveChart = async () => {
    if (!currentChart) return

    const chartData = {
      name: currentChart.name,
      description: currentChart.description,
      data: currentChart.data,
      updated_at: new Date().toISOString(),
    }

    if (currentChart.id) {
      // Update existing
      await supabase.from("org_charts").update(chartData).eq("id", currentChart.id)
    } else {
      // Insert new
      const { data } = await supabase.from("org_charts").insert([chartData]).select().single()
      if (data) {
        setCurrentChart({ ...currentChart, id: data.id })
      }
    }

    await loadOrgCharts()
  }

  const deleteChart = async (id: string) => {
    if (confirm("Möchtest du dieses Organigramm wirklich löschen?")) {
      await supabase.from("org_charts").delete().eq("id", id)
      await loadOrgCharts()
      if (currentChart?.id === id) {
        setCurrentChart(null)
        setIsEditing(false)
      }
    }
  }

  const exportAsJSON = () => {
    if (!currentChart) return
    const dataStr = JSON.stringify(currentChart, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${currentChart.name.replace(/\s+/g, "_")}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as OrgChart
        // Remove id to create as new, or keep to update existing
        const chartToImport: OrgChart = {
          ...imported,
          id: undefined, // This will create a new chart
        }
        setCurrentChart(chartToImport)
        setIsEditing(true)
      } catch (error) {
        alert("Fehler beim Importieren der JSON-Datei")
      }
    }
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const exportAsPNG = async () => {
    if (!chartRef.current) return

    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
      })

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `${currentChart?.name.replace(/\s+/g, "_") || "organigramm"}.png`
          link.click()
          URL.revokeObjectURL(url)
        }
      })
    } catch (error) {
      console.error("[v0] PNG Export Error:", error)
      alert("Fehler beim Exportieren als PNG")
    }
  }

  const addChild = (parentId: string) => {
    if (!currentChart) return

    const newNode: OrgNode = {
      id: crypto.randomUUID(),
      name: "Neues Mitglied",
      position: "Position",
      children: [],
    }

    const addToNode = (node: OrgNode): OrgNode => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, newNode] }
      }
      return { ...node, children: node.children.map(addToNode) }
    }

    setCurrentChart({ ...currentChart, data: addToNode(currentChart.data) })
  }

  const editNode = (nodeId: string) => {
    if (!currentChart) return

    const findNode = (node: OrgNode): OrgNode | null => {
      if (node.id === nodeId) return node
      for (const child of node.children) {
        const found = findNode(child)
        if (found) return found
      }
      return null
    }

    const node = findNode(currentChart.data)
    if (node) {
      setEditingNode({ id: node.id, name: node.name, position: node.position })
    }
  }

  const saveEditedNode = () => {
    if (!currentChart || !editingNode) return

    const updateNode = (node: OrgNode): OrgNode => {
      if (node.id === editingNode.id) {
        return { ...node, name: editingNode.name, position: editingNode.position }
      }
      return { ...node, children: node.children.map(updateNode) }
    }

    setCurrentChart({ ...currentChart, data: updateNode(currentChart.data) })
    setEditingNode(null)
  }

  const deleteNode = (nodeId: string) => {
    if (!currentChart) return
    if (currentChart.data.id === nodeId) {
      alert("Der Hauptknoten kann nicht gelöscht werden")
      return
    }

    const removeFromNode = (node: OrgNode): OrgNode => {
      return {
        ...node,
        children: node.children.filter((child) => child.id !== nodeId).map(removeFromNode),
      }
    }

    setCurrentChart({ ...currentChart, data: removeFromNode(currentChart.data) })
  }

  const backToList = () => {
    setIsEditing(false)
    setCurrentChart(null)
  }

  if (isEditing && currentChart) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={backToList}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <div>
                <h1 className="text-xl font-bold">{currentChart.name}</h1>
                {currentChart.description && (
                  <p className="text-sm text-muted-foreground">{currentChart.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveChart} variant="default">
                <Save className="mr-2 h-4 w-4" />
                Speichern
              </Button>
              <Button onClick={exportAsJSON} variant="outline">
                <FileJson className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button onClick={exportAsPNG} variant="outline">
                <FileImage className="mr-2 h-4 w-4" />
                PNG
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div ref={chartRef} className="bg-background p-8 rounded-lg overflow-x-auto">
            <OrgChartNode
              node={currentChart.data}
              onAddChild={addChild}
              onEdit={editNode}
              onDelete={deleteNode}
              level={0}
            />
          </div>
        </main>

        {editingNode && (
          <Dialog open={!!editingNode} onOpenChange={() => setEditingNode(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mitglied bearbeiten</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="node-name">Name</Label>
                  <Input
                    id="node-name"
                    value={editingNode.name}
                    onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="node-position">Position</Label>
                  <Input
                    id="node-position"
                    value={editingNode.position}
                    onChange={(e) => setEditingNode({ ...editingNode, position: e.target.value })}
                  />
                </div>
                <Button onClick={saveEditedNode} className="w-full">
                  Speichern
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Organigramm Editor</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Meine Organigramme</h2>
            <p className="text-muted-foreground mt-1">Erstelle und verwalte deine Organigramme</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".json" onChange={importFromJSON} className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              JSON Importieren
            </Button>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Neues Organigramm
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neues Organigramm erstellen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="chart-name">Name</Label>
                    <Input
                      id="chart-name"
                      placeholder="z.B. Unternehmensstruktur"
                      value={chartName}
                      onChange={(e) => setChartName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="chart-description">Beschreibung (optional)</Label>
                    <Textarea
                      id="chart-description"
                      placeholder="Beschreibe dein Organigramm..."
                      value={chartDescription}
                      onChange={(e) => setChartDescription(e.target.value)}
                    />
                  </div>
                  <Button onClick={createNewChart} className="w-full">
                    Erstellen
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {orgCharts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Du hast noch keine Organigramme erstellt</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  JSON Importieren
                </Button>
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Organigramm erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgCharts.map((chart) => (
              <Card key={chart.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{chart.name}</CardTitle>
                  <CardDescription>{chart.description || "Keine Beschreibung"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Zuletzt bearbeitet: {new Date(chart.updated_at!).toLocaleDateString("de-DE")}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => loadChart(chart)} className="flex-1">
                      <Edit2 className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteChart(chart.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
