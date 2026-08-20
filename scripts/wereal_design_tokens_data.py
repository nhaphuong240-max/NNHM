"""
WEREAL REOS — Design token catalog for export.
Sync: prototype/src/config/designTokens.ts · prototype/src/index.css
"""

from __future__ import annotations

BRAND = {
    "primary": "#0F4C81",
    "primary-light": "#1a6bb5",
    "primary-dark": "#0a3d6b",
    "primary-foreground": "#FFFFFF",
    "secondary": "#E8F1F8",
    "accent": "#C9A227",
    "accent-light": "#e8c547",
    "accent-dark": "#a8861f",
    "success": "#16A34A",
    "warning": "#EA580C",
    "destructive": "#DC2626",
    "muted": "#64748B",
    "background": "#FAFBFC",
    "surface": "#FFFFFF",
    "border": "#E2E8F0",
    "page": "#F4F7FA",
}

SEMANTIC = {
    "verified": {"bg": "#DCFCE7", "text": "#166534", "border": "#BBF7D0"},
    "hot-lead": {"bg": "#FFEDD5", "text": "#C2410C", "border": "#FED7AA"},
    "reserved": {"bg": "#FEF3C7", "text": "#B45309", "border": "#FDE68A"},
    "available": {"bg": "#DCFCE7", "text": "#15803D", "border": "#BBF7D0"},
    "sold": {"bg": "#F1F5F9", "text": "#475569", "border": "#E2E8F0"},
    "pending": {"bg": "#EFF6FF", "text": "#1D4ED8", "border": "#BFDBFE"},
    "drift-block": {"bg": "#FEE2E2", "text": "#B91C1C", "border": "#FECACA"},
}

PORTAL_THEMES = {
    "public": {"label": "Public Portal", "accent": "#0F4C81", "accent-soft": "#0F4C8114"},
    "agent": {"label": "Agent Portal", "accent": "#0F4C81", "accent-soft": "#0F4C8114"},
    "admin": {"label": "Admin / Ops Portal", "accent": "#0a3d6b", "accent-soft": "#0a3d6b18"},
    "developer": {"label": "Portal Chủ đầu tư", "accent": "#0F4C81", "accent-soft": "#0F4C8114"},
    "finance": {"label": "Finance Portal", "accent": "#0F766E", "accent-soft": "#0F766E18"},
    "buyer": {"label": "Buyer Portal", "accent": "#1a6bb5", "accent-soft": "#1a6bb518"},
    "auth": {"label": "Đăng nhập", "accent": "#0F4C81", "accent-soft": "#0F4C8114"},
    "system": {"label": "System", "accent": "#475569", "accent-soft": "#47556918"},
}

SPACING = {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "6": "24px",
    "8": "32px",
    "12": "48px",
}

RADIUS = {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "2xl": "16px",
}

LAYOUT = {
    "max-width": "1600px",
    "header-height": "64px",
    "sidebar-width": "256px",
    "content-padding-mobile": "16px",
    "content-padding-desktop": "32px",
}

TYPOGRAPHY = {
    "display-lg": "36px",
    "h1": "30px",
    "h1-lg": "32px",
    "h2": "24px",
    "h2-lg": "24px",
    "h3": "18px",
    "body-lg": "16px",
    "body-sm": "14px",
    "label": "12px",
    "price": "24px",
    "mono": "13px",
}

FONT_WEIGHT = {
    "regular": 400,
    "medium": 500,
    "semibold": 600,
    "bold": 700,
}

SHADOW = {
    "sm": "0 1px 2px rgba(0, 0, 0, 0.05)",
    "md": "0 4px 12px rgba(0, 0, 0, 0.08)",
    "lg": "0 8px 24px rgba(0, 0, 0, 0.12)",
}

META = {
    "name": "WEREAL REOS Design Tokens",
    "version": "2.1.0",
    "baseline": "WEREAL-BL-2026-002",
    "source": "prototype/src/config/designTokens.ts",
}
