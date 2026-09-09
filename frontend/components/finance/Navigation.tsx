"use client";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { type AuthUser } from "@/frontend/api";
import { nav } from "@/frontend/finance/navigation";
import type { View } from "@/frontend/finance/types";
import { Focus, Leaf, LogOut } from "lucide-react";
import Link from "next/link";
export default function Navigation({
  view,
  onNav,
  focus,
  setFocus,
  user,
  onLogout,
}: {
  view: View;
  onNav: (value: View) => void;
  focus: boolean;
  setFocus: (value: boolean) => void;
  user: AuthUser;
  onLogout: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Sidebar className="app-sidebar">
      <SidebarHeader>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Leaf size={24} />
          </span>
          clareza<span className="brand-dot">.</span>
        </Link>
        <span className="brand-caption">UM PASSO DE CADA VEZ</span>
      </SidebarHeader>
      <SidebarContent>
        <div className="nav-label">MEU DINHEIRO</div>
        <SidebarMenu>
          {nav.map(([id, label, Icon]) => (
            <SidebarMenuItem key={id}>
              <SidebarMenuButton
                isActive={view === id}
                onClick={() => {
                  onNav(id);
                  setOpenMobile(false);
                }}
              >
                <Icon />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="focus-box">
          <div>
            <Focus size={19} />
            <strong>Modo foco</strong>
            <Switch
              aria-label="Ativar modo foco"
              checked={focus}
              onCheckedChange={setFocus}
            />
          </div>
          <p>Só o essencial. No seu ritmo.</p>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="sidebar-note">
          <Leaf size={20} />
          <p>
            Pequenos registros.
            <br />
            <strong>Grandes mudanças.</strong>
          </p>
        </div>
        <div className="profile">
          <span className="avatar">{initials || "EU"}</span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button
            type="button"
            className="profile-logout"
            onClick={onLogout}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
