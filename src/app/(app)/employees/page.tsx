import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"

export default function EmployeesPage() {
  return (
    <>
      <PageHeader title="Employees" description="Manage employee attendance, salary, and advances.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
          <CardDescription>This feature is coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You will be able to manage your workers' information here.</p>
        </CardContent>
      </Card>
    </>
  )
}
