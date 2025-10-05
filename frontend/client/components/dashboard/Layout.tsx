import Sidebar from "./Sidebar";
import Header from "./Header";
import { PropertyProvider } from "../../../shared/PropertyContext";
import { useParams } from "react-router-dom";
import { ConnectionProvider } from '../../../shared/ConnectionContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { propertyId } = useParams();
  return (
    <ConnectionProvider>
      <PropertyProvider propertyId={propertyId}>
        <div className="flex h-screen bg-white overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <Header />

            {/* Page Content */}
            <div className="flex-1 overflow-auto pt-16 lg:pt-0">{children}</div>
          </div>
        </div>
      </PropertyProvider>
    </ConnectionProvider>
  );
}
