# 🃏 Card Game P2P - Project TODO

## Overview

เว็บรวมเกมไพ่ P2P (Peer-to-Peer) พัฒนาด้วย Next.js App Router + PeerJS

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, next-themes (dark mode)
- **State**: Zustand + localforage (persist)
- **P2P**: PeerJS
- **Icons**: Lucide React
- **Forms**: react-hook-form + zod

---

## Phase 1: P2P Version (No Backend Required)

### 🏗️ Foundation (Priority: HIGH)

- [x] ~~Project setup with Next.js~~
- [ ] **MainLayout** - Header, Footer, Theme Toggle
- [ ] **UserStore** - Zustand persist with localforage (local user profile)
- [ ] **ThemeProvider** - Dark mode support

### 📄 Pages

| Page        | Route                        | Description            |
| ----------- | ---------------------------- | ---------------------- |
| Landing     | `/`                          | หน้าแรก แนะนำเว็บ      |
| Games Hub   | `/games`                     | หน้ารวมเกมทั้งหมด      |
| Profile     | `/profile`                   | โปรไฟล์ผู้เล่น (local) |
| Slave Game  | `/games/slave`               | ไพ่สลาฟ                |
| Slave Lobby | `/games/slave/lobby`         | ห้องรอเล่นไพ่สลาฟ      |
| Slave Room  | `/games/slave/room/[roomId]` | ห้องเล่นไพ่สลาฟ        |
| Pok Deng    | `/games/pokdeng`             | ไพ่ป๊อกเดง             |
| Kang        | `/games/kang`                | ไพ่แคง                 |
| Poker       | `/games/poker`               | โปกเกอร์               |
| Thai Dummy  | `/games/dummy`               | ไทยดัมมี่              |
| Blackjack   | `/games/blackjack`           | แบล็คแจ็ค              |

### 🎮 Card Games List

1. **ไพ่สลาฟ (Slave)** - เกมไพ่ทิ้ง 2-4 คน
2. **ไพ่ป๊อกเดง (Pok Deng)** - เกมไพ่เปรียบ 2-9 คน
3. **ไพ่แคง (Kang)** - เกมไพ่ไทย 2-6 คน
4. **โปกเกอร์ (Poker)** - Texas Hold'em 2-9 คน
5. **ไทยดัมมี่ (Thai Dummy)** - เกมจับคู่ 2-4 คน
6. **แบล็คแจ็ค (Blackjack)** - เกมไพ่ 21 1-7 คน

### 🔧 Core Systems

#### PeerJS P2P System

- [ ] `PeerStore` - จัดการ PeerJS connections
- [ ] `RoomStore` - จัดการห้องเล่น (host/join)
- [ ] P2P message protocol

#### User System (Local)

- [ ] `UserStore` - เก็บข้อมูลผู้เล่นใน local
  - userId (auto-generated UUID)
  - displayName
  - avatar
  - stats (wins, losses, games played)

#### Game Engine

- [ ] `CardDeck` - Deck management (shuffle, deal)
- [ ] `GameState` - Base game state management
- [ ] Per-game logic (slave, pokdeng, etc.)

### 🎨 UI Components

#### Atoms

- [ ] Button
- [ ] Card (playing card)
- [ ] Avatar
- [ ] Badge
- [ ] Input
- [ ] Modal

#### Molecules

- [ ] PlayerCard (avatar + name + status)
- [ ] GameCard (game thumbnail + info)
- [ ] RoomCard (room info + players)
- [ ] ThemeToggle

#### Organisms

- [ ] Header
- [ ] Footer
- [ ] GameGrid
- [ ] PlayerList
- [ ] ChatBox

#### Templates

- [ ] MainLayout
- [ ] GameLayout

---

## Phase 2: Server Version (Future - Optional)

### 🔐 Authentication

- [ ] Supabase Auth integration
- [ ] Login/Register pages
- [ ] Protected routes

### 🗄️ Database

- [ ] Supabase setup
- [ ] User profiles table
- [ ] Game history table
- [ ] Leaderboards

### 🎮 Game Server

- [ ] Colyseus server setup
- [ ] Room management
- [ ] Game state sync
- [ ] Anti-cheat measures

---

## Folder Structure

```
card-game-p2p-nextjs/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Landing page
│   ├── games/
│   │   ├── page.tsx            # Games hub
│   │   ├── slave/
│   │   │   ├── page.tsx        # Slave game info
│   │   │   ├── lobby/
│   │   │   │   └── page.tsx    # Lobby
│   │   │   └── room/
│   │   │       └── [roomId]/
│   │   │           └── page.tsx # Game room
│   │   ├── pokdeng/
│   │   ├── kang/
│   │   ├── poker/
│   │   ├── dummy/
│   │   └── blackjack/
│   └── profile/
│       └── page.tsx            # User profile
│
├── src/
│   ├── domain/                  # Business logic & types
│   │   ├── entities/
│   │   │   ├── User.ts
│   │   │   ├── Card.ts
│   │   │   ├── Room.ts
│   │   │   └── games/
│   │   │       ├── SlaveGame.ts
│   │   │       ├── PokDengGame.ts
│   │   │       └── ...
│   │   └── types/
│   │       ├── card.types.ts
│   │       ├── game.types.ts
│   │       └── room.types.ts
│   │
│   ├── infrastructure/          # External services
│   │   ├── peer/
│   │   │   └── PeerService.ts
│   │   └── storage/
│   │       └── localforage.ts
│   │
│   └── presentation/            # UI Layer
│       ├── components/
│       │   ├── atoms/
│       │   │   ├── Button.tsx
│       │   │   ├── PlayingCard.tsx
│       │   │   └── ...
│       │   ├── molecules/
│       │   │   ├── ThemeToggle.tsx
│       │   │   ├── PlayerCard.tsx
│       │   │   └── ...
│       │   ├── organisms/
│       │   │   ├── Header.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── ...
│       │   └── templates/
│       │       ├── MainLayout.tsx
│       │       └── GameLayout.tsx
│       │
│       ├── providers/
│       │   └── ThemeProvider.tsx
│       │
│       ├── stores/
│       │   ├── userStore.ts
│       │   ├── peerStore.ts
│       │   └── roomStore.ts
│       │
│       └── presenters/          # Clean Architecture presenters
│           ├── landing/
│           ├── games/
│           └── profile/
│
└── public/
    ├── images/
    │   ├── cards/              # Card images
    │   └── avatars/            # Avatar images
    └── styles/
```

---

## Current Sprint: Foundation Setup

### Task 1: MainLayout + Theme Toggle ✅ (In Progress)

1. Create ThemeProvider with next-themes
2. Create ThemeToggle component
3. Create Header component
4. Create Footer component
5. Create MainLayout template
6. Update root layout

### Task 2: User System

1. Create UserStore with Zustand
2. Implement localforage persistence
3. Create user profile generation (UUID, default name)

### Task 3: Landing Page

1. Create LandingView component
2. Hero section
3. Game cards preview
4. Features section

---

## Notes

- Phase 1 ใช้ PeerJS ทำ P2P ไม่ต้องมี backend
- ข้อมูล user เก็บใน browser ด้วย localforage
- ทุกเกมสามารถเล่นได้ทันทีโดยไม่ต้อง login
- Phase 2 (optional) เพิ่ม Colyseus server และ Supabase
