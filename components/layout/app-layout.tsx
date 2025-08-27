import { AppHeader } from "./app-header"

interface AppLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
}

export function AppLayout({ children, showHeader = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950">
      {showHeader && <AppHeader />}
      <div className={showHeader ? "pt-16" : ""}>
        {children}
      </div>
    </div>
  )
}