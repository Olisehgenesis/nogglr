import { sdk } from '@farcaster/miniapp-sdk'

export type FarcasterUserDisplay = { name?: string; username?: string; pfpUrl?: string }

export async function resolveFarcasterSelf(): Promise<FarcasterUserDisplay | undefined> {
  try {
    const inMini = await sdk.isInMiniApp()
    if (!inMini) return undefined
    const context = await sdk.context
    const u = context?.user
    if (!u) return undefined
    return { name: u.displayName || u.username || `FID ${u.fid}`, username: u.username, pfpUrl: u.pfpUrl }
  } catch {
    return undefined
  }
}


