"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Upload, FileImage, Save, ArrowLeft, Users } from "lucide-react"
import { OrgChartNode } from "@/components/org-chart-node"
import type { OrgNode, OrgChart, Group } from "@/types/org-chart"
import html2canvas from "html2canvas"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export default function HomePage() {
  const [currentChart, setCurrentChart] = useState<OrgChart | null>(null)
  const [editingNode, setEditingNode] = useState<{ id: string; name: string; position: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [chartName, setChartName] = useState("")
  const [chartDescription, setChartDescription] = useState("")
  const [jsonEditorValue, setJsonEditorValue] = useState("")
  const [jsonError, setJsonError] = useState("")
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [selectedLeaders, setSelectedLeaders] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const chartRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentChart) {
      setJsonEditorValue(JSON.stringify(currentChart, null, 2))
      setJsonError("")
    }
  }, [currentChart])

  const getAllMembers = (): { id: string; name: string; position: string }[] => {
    if (!currentChart) return []
    const members: { id: string; name: string; position: string }[] = []
    const traverse = (node: OrgNode) => {
      members.push({ id: node.id, name: node.name, position: node.position })
      node.children.forEach(traverse)
    }
    traverse(currentChart.data)
    return members
  }

  const createNewChart = () => {
    const newChart: OrgChart = {
      name: chartName || "New Organization Chart",
      description: chartDescription,
      data: {
        id: crypto.randomUUID(),
        name: "Root",
        position: "Top Level",
        children: [],
      },
      groups: [],
    }
    setCurrentChart(newChart)
    setShowDialog(false)
    setChartName("")
    setChartDescription("")
  }

  const saveAsJSON = () => {
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
        if (!imported.groups) imported.groups = []
        setCurrentChart(imported)
      } catch (error) {
        alert("Error importing JSON file")
      }
    }
    reader.readAsText(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const exportAsPNG = async () => {
    if (!chartRef.current) return

    try {
      const clonedElement = chartRef.current.cloneNode(true) as HTMLElement

      const tempContainer = document.createElement("div")
      tempContainer.style.position = "absolute"
      tempContainer.style.left = "-9999px"
      tempContainer.style.top = "-9999px"
      tempContainer.style.background = "#ffffff"
      document.body.appendChild(tempContainer)
      tempContainer.appendChild(clonedElement)

      const convertColors = (element: HTMLElement) => {
        const computedStyle = window.getComputedStyle(element)

        const bgColor = computedStyle.backgroundColor
        const textColor = computedStyle.color
        const borderColor = computedStyle.borderColor

        if (bgColor && bgColor !== "rgba(0, 0, 0, 0)") {
          element.style.backgroundColor = bgColor
        }
        if (textColor) {
          element.style.color = textColor
        }
        if (borderColor) {
          element.style.borderColor = borderColor
        }

        Array.from(element.children).forEach((child) => {
          if (child instanceof HTMLElement) {
            convertColors(child)
          }
        })
      }

      convertColors(clonedElement)

      const canvas = await html2canvas(clonedElement, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
      })

      document.body.removeChild(tempContainer)

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `${currentChart?.name.replace(/\s+/g, "_") || "organization-chart"}.png`
          link.click()
          URL.revokeObjectURL(url)
        }
      })
    } catch (error) {
      console.error("[v0] PNG Export Error:", error)
      alert("Error exporting as PNG")
    }
  }

  const addChild = (parentId: string) => {
    if (!currentChart) return

    const newNode: OrgNode = {
      id: crypto.randomUUID(),
      name: "New Person/Group",
      position: "Position/Department",
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
      alert("Cannot delete the root node")
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

  const handleJsonChange = (value: string) => {
    setJsonEditorValue(value)
    try {
      const parsed = JSON.parse(value) as OrgChart
      setCurrentChart(parsed)
      setJsonError("")
    } catch (error) {
      setJsonError("Invalid JSON format")
    }
  }

  const backToStart = () => {
    if (confirm("Go back? Unsaved changes will be lost.")) {
      setCurrentChart(null)
    }
  }

  const openNewGroupDialog = () => {
    setEditingGroup(null)
    setGroupName("")
    setGroupDescription("")
    setSelectedLeaders([])
    setSelectedMembers([])
    setShowGroupDialog(true)
  }

  const openEditGroupDialog = (group: Group) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupDescription(group.description || "")
    setSelectedLeaders(group.leaderIds)
    setSelectedMembers(group.memberIds)
    setShowGroupDialog(true)
  }

  const saveGroup = () => {
    if (!currentChart || !groupName.trim()) return

    const newGroup: Group = {
      id: editingGroup?.id || crypto.randomUUID(),
      name: groupName,
      description: groupDescription,
      leaderIds: selectedLeaders,
      memberIds: selectedMembers,
    }

    const updatedGroups = editingGroup
      ? currentChart.groups?.map((g) => (g.id === editingGroup.id ? newGroup : g)) || []
      : [...(currentChart.groups || []), newGroup]

    setCurrentChart({ ...currentChart, groups: updatedGroups })
    setShowGroupDialog(false)
  }

  const deleteGroup = (groupId: string) => {
    if (!currentChart) return
    if (confirm("Delete this group?")) {
      setCurrentChart({
        ...currentChart,
        groups: currentChart.groups?.filter((g) => g.id !== groupId) || [],
      })
    }
  }

  const toggleLeader = (memberId: string) => {
    setSelectedLeaders((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  if (currentChart) {
    const allMembers = getAllMembers()

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={backToStart}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold">{currentChart.name}</h1>
                {currentChart.description && (
                  <p className="text-sm text-muted-foreground">{currentChart.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveAsJSON} variant="default">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button onClick={exportAsPNG} variant="outline">
                <FileImage className="mr-2 h-4 w-4" />
                PNG Export
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="visual" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="visual">Visual</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="json">JSON Editor</TabsTrigger>
            </TabsList>

            <TabsContent value="visual" className="mt-6">
              <div ref={chartRef} className="bg-background p-8 rounded-lg overflow-x-auto">
                <OrgChartNode node={currentChart.data} onAddChild={addChild} onEdit={editNode} onDelete={deleteNode} />
              </div>
            </TabsContent>

            <TabsContent value="groups" className="mt-6">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Group Management</CardTitle>
                        <CardDescription>
                          Create groups with leaders and members. All members are subordinate to the group leaders.
                        </CardDescription>
                      </div>
                      <Button onClick={openNewGroupDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Group
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!currentChart.groups || currentChart.groups.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No groups created yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentChart.groups.map((group) => {
                          const leaders = allMembers.filter((m) => group.leaderIds.includes(m.id))
                          const members = allMembers.filter((m) => group.memberIds.includes(m.id))
                          return (
                            <Card key={group.id} className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="font-semibold text-lg">{group.name}</h3>
                                  {group.description && (
                                    <p className="text-sm text-muted-foreground">{group.description}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEditGroupDialog(group)}>
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => deleteGroup(group.id)}>
                                    Delete
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm font-medium mb-1">Leaders ({leaders.length})</p>
                                  <div className="flex flex-wrap gap-2">
                                    {leaders.map((leader) => (
                                      <Badge key={leader.id} variant="default">
                                        {leader.name}
                                      </Badge>
                                    ))}
                                    {leaders.length === 0 && (
                                      <span className="text-sm text-muted-foreground">No leaders assigned</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium mb-1">Members ({members.length})</p>
                                  <div className="flex flex-wrap gap-2">
                                    {members.map((member) => (
                                      <Badge key={member.id} variant="secondary">
                                        {member.name}
                                      </Badge>
                                    ))}
                                    {members.length === 0 && (
                                      <span className="text-sm text-muted-foreground">No members assigned</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="json" className="mt-6">
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>JSON Editor</CardTitle>
                    <CardDescription>
                      Edit the structure directly as JSON. Changes are applied immediately.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={jsonEditorValue}
                      onChange={(e) => handleJsonChange(e.target.value)}
                      className="font-mono text-sm min-h-[500px]"
                      placeholder="JSON structure..."
                    />
                    {jsonError && <p className="text-destructive text-sm mt-2">{jsonError}</p>}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {editingNode && (
          <Dialog open={!!editingNode} onOpenChange={() => setEditingNode(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="node-name">Name (Person/Group)</Label>
                  <Input
                    id="node-name"
                    value={editingNode.name}
                    onChange={(e) => setEditingNode({ ...editingNode, name: e.target.value })}
                    placeholder="e.g. John Doe or Marketing Team"
                  />
                </div>
                <div>
                  <Label htmlFor="node-position">Position/Department</Label>
                  <Input
                    id="node-position"
                    value={editingNode.position}
                    onChange={(e) => setEditingNode({ ...editingNode, position: e.target.value })}
                    placeholder="e.g. Department Head or Social Media"
                  />
                </div>
                <Button onClick={saveEditedNode} className="w-full">
                  Save
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showGroupDialog && (
          <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGroup ? "Edit Group" : "New Group"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Marketing Team"
                  />
                </div>
                <div>
                  <Label htmlFor="group-description">Description (optional)</Label>
                  <Textarea
                    id="group-description"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Describe the group..."
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Group Leaders</Label>
                  <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto space-y-2">
                    {allMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`leader-${member.id}`}
                          checked={selectedLeaders.includes(member.id)}
                          onCheckedChange={() => toggleLeader(member.id)}
                        />
                        <label htmlFor={`leader-${member.id}`} className="text-sm cursor-pointer flex-1">
                          {member.name} - {member.position}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Members</Label>
                  <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto space-y-2">
                    {allMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`member-${member.id}`}
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={() => toggleMember(member.id)}
                        />
                        <label htmlFor={`member-${member.id}`} className="text-sm cursor-pointer flex-1">
                          {member.name} - {member.position}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={saveGroup} className="w-full" disabled={!groupName.trim()}>
                  {editingGroup ? "Update Group" : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Organization Chart Editor</CardTitle>
            <CardDescription>Create and manage hierarchical structures</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <input ref={fileInputRef} type="file" accept=".json" onChange={importFromJSON} className="hidden" />

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full max-w-sm">
                  <Plus className="mr-2 h-5 w-5" />
                  Create New Chart
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Organization Chart</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="chart-name">Name</Label>
                    <Input
                      id="chart-name"
                      placeholder="e.g. Company Structure"
                      value={chartName}
                      onChange={(e) => setChartName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="chart-description">Description (optional)</Label>
                    <Textarea
                      id="chart-description"
                      placeholder="Describe your organization chart..."
                      value={chartDescription}
                      onChange={(e) => setChartDescription(e.target.value)}
                    />
                  </div>
                  <Button onClick={createNewChart} className="w-full">
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              size="lg"
              variant="outline"
              className="w-full max-w-sm bg-transparent"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-5 w-5" />
              Import JSON File
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
