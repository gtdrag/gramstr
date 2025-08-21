import { getCustomerByUserId, createCustomer } from "@/actions/customers"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import DashboardClientLayout from "./_components/layout-client"

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user) {
    redirect("/login")
  }

  let customer = await getCustomerByUserId(user.id)

  // Create customer record if it doesn't exist
  if (!customer) {
    const result = await createCustomer(user.id)
    if (result.isSuccess && result.data) {
      customer = result.data
    } else {
      redirect("/?error=customer-creation-failed")
    }
  }

  // For now, allow both free and pro users for testing
  // Uncomment the line below to restrict to pro users only
  // if (customer.membership !== "pro") {
  //   redirect("/?redirect=dashboard#pricing")
  // }

  const userData = {
    name:
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.username || "User",
    email: user.emailAddresses[0]?.emailAddress || "",
    avatar: user.imageUrl,
    membership: customer.membership
  }

  return (
    <DashboardClientLayout userData={userData}>
      {children}
    </DashboardClientLayout>
  )
}
