
export type MpdStatus = {
    volume: number
    repeat: boolean
    playlist: number
    state: 'play' | 'stop' | 'pause',
    elapsed: number
    duration: number
}
