import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"

export default function SuppliersPage() {
  return (
    <>
      <PageHeader title="Suppliers" description="Manage your suppliers and track payments.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Supplier Ledger</CardTitle>
          <CardDescription>This feature is coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>You will be able to keep track of wholesale purchases and outstanding payments to suppliers here.</p>
        </CardContent>
      </Card>
    </>
  )
}
