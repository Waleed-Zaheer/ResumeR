/**
 * topLoader — the module-scoped store and imperative API behind the
 * `<TopLoader />` component (src/components/ui/top-loader.tsx). Lives in its
 * own file (rather than inside top-loader.tsx) so the component file only
 * exports a React component and stays hot-reloadable under Vite's Fast
 * Refresh — a file that mixes component and non-component exports forces a
 * full page reload on every edit.
 *
 * Usage:
 *   import { topLoader } from "@/lib/top-loader"
 *
 *   topLoader.start()
 *   await doSlowThing()
 *   topLoader.done()
 *
 * Depends on: nothing (no other project files required).
 */

type TopLoaderStatus = "initial" | "loading" | "done"
type TopLoaderState = { progress: number; status: TopLoaderStatus }
type Subscriber = (state: TopLoaderState) => void

class TopLoaderStore {
  state: TopLoaderState = { progress: 0, status: "initial" }
  private subscribers: Subscriber[] = []

  subscribe(cb: Subscriber) {
    this.subscribers.push(cb)
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb)
    }
  }
  private publish() {
    this.subscribers.forEach((cb) => cb(this.state))
  }

  start(initial = 0.08) {
    const floor = initial * 100
    const progress = this.state.status === "loading" ? Math.max(this.state.progress, floor) : floor
    this.state = { progress, status: "loading" }
    this.publish()
  }
  set(n: number) {
    const progress = Math.min(100, Math.max(0, n))
    this.state = { progress, status: progress >= 100 ? "done" : "loading" }
    this.publish()
  }
  /** Nudges progress toward (but never reaching) 100 - the classic
   * nprogress trickle curve, so it visibly slows down the further along
   * it gets instead of ticking up at a constant rate. */
  inc(amount?: number) {
    if (this.state.status !== "loading") return
    const current = this.state.progress
    let next = current
    if (amount !== undefined) next = current + amount
    else if (current < 20) next = current + 10
    else if (current < 50) next = current + 4
    else if (current < 80) next = current + 2
    else if (current < 99) next = current + 0.5
    this.set(Math.min(next, 99))
  }
  done(force = false) {
    if (this.state.status !== "loading" && !force) return
    this.state = { progress: 100, status: "done" }
    this.publish()
  }
  reset() {
    this.state = { progress: 0, status: "initial" }
    this.publish()
  }
}

const topLoaderStore = new TopLoaderStore()

const topLoader = {
  start: (initial?: number) => topLoaderStore.start(initial),
  set: (n: number) => topLoaderStore.set(n),
  inc: (amount?: number) => topLoaderStore.inc(amount),
  done: (force?: boolean) => topLoaderStore.done(force),
}

export { topLoader, topLoaderStore }
export type { TopLoaderState, TopLoaderStatus }
