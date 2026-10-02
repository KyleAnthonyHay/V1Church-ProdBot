// Content for the public demo church. Fictional by design: the demo org is
// labelled as a demo everywhere it appears and is reset nightly.

export const DEMO_EMAIL = "demo@prodbot.app";
export const DEMO_PASSWORD = "prodbot-demo";
export const DEMO_CHURCH = "Riverside Church (Demo)";

const DOWNTOWN_WIRING = `# Riverside Downtown: main auditorium
nodes:
  - id: kick_mic
    label: Kick mic
    type: source
    group: drums
    model: Shure Beta 91A
    location: Drum riser
  - id: snare_mic
    label: Snare mic
    type: source
    group: drums
    model: Shure SM57
    location: Drum riser
  - id: overhead_mics
    label: Overheads
    type: source
    group: drums
    model: AKG C414 pair
    location: Drum riser
  - id: bass_di
    label: Bass DI
    type: source
    group: bass
    model: Radial J48
    notes: Ground lift ON
  - id: keys_di
    label: Keys DI
    type: source
    group: keys
    model: Radial ProD2 (stereo)
  - id: vocal_rx
    label: Vocal wireless receiver
    type: wireless
    group: vocals
    model: Shure ULXD4Q
    location: Stage rack
  - id: playback_mac
    label: Playback Mac
    type: playback
    group: playback
    model: MacBook Pro, Ableton Live 12
    location: Stage left
  - id: playback_interface
    label: Playback interface
    type: interface
    group: playback
    model: Focusrite Clarett+ 8Pre
    location: Stage left
  - id: stagebox_a
    label: Stage box A
    type: stagebox
    group: stage_io
    model: Waves SoundGrid IOX
    location: Drum riser
  - id: stage_rack
    label: Stage rack
    type: subsystem
    group: stage_io
    location: Stage left
  - id: rack_iox
    label: Rack IOX
    type: stagebox
    group: stage_io
    model: Waves SoundGrid IOX
    parent: stage_rack
  - id: rack_power
    label: Rack power conditioner
    type: other
    group: stage_io
    model: Furman P-1800 AR
    parent: stage_rack
    notes: Turn on first, off last
  - id: network_switch
    label: SoundGrid switch
    type: network
    group: network
    model: Netgear GS728TP
    location: Stage rack
  - id: soundgrid_server
    label: SoundGrid server
    type: server
    group: network
    model: Waves Extreme Server-C
    location: FOH rack
  - id: foh_console
    label: FOH console
    type: console
    group: foh
    model: Waves eMotion LV1
    location: FOH
  - id: pa_processor
    label: PA processor
    type: processor
    group: pa
    model: Lake LM 44
    location: FOH rack
  - id: main_pa
    label: Main PA
    type: speaker
    group: pa
    model: L-Acoustics Kara II
  - id: subs
    label: Subs
    type: speaker
    group: pa
    model: L-Acoustics SB18
  - id: iem_tx
    label: IEM transmitters
    type: iem
    group: monitors
    model: Shure PSM1000
    location: Stage rack
  - id: drummer_iem
    label: Drummer IEM
    type: iem
    group: monitors
  - id: vocal_iem
    label: Vocal IEMs
    type: iem
    group: monitors
  - id: broadcast_mac
    label: Broadcast mix Mac
    type: computer
    group: broadcast
    model: Mac mini
    location: Broadcast booth
edges:
  - from: kick_mic
    to: stagebox_a
    signal: analog_mic
    cable: XLR
    port: In 1
    channel: LV1 ch 1
  - from: snare_mic
    to: stagebox_a
    signal: analog_mic
    cable: XLR
    port: In 2
    channel: LV1 ch 2
  - from: overhead_mics
    to: stagebox_a
    signal: analog_mic
    cable: XLR
    format: stereo
    port: In 5-6
    channel: LV1 ch 5-6
  - from: bass_di
    to: stagebox_a
    signal: analog_mic
    cable: XLR
    port: In 9
    channel: LV1 ch 9
  - from: keys_di
    to: stagebox_a
    signal: analog_mic
    cable: XLR
    format: stereo
    port: In 11-12
    channel: LV1 ch 11-12
  - from: playback_mac
    to: playback_interface
    signal: usb
    cable: USB Type C
  - from: playback_interface
    to: stagebox_a
    signal: analog_line
    cable: XLR
    format: stereo
    port: In 13-14
    channel: Tracks L/R
  - from: playback_interface
    to: stagebox_a
    signal: analog_line
    cable: XLR
    port: In 15
    channel: Click
    notes: Clarett out 3. Click goes to IEMs only, never the PA.
  - from: vocal_rx
    to: rack_iox
    signal: analog_line
    cable: XLR
    port: In 1-4
    channel: LV1 ch 17-20
  - from: stagebox_a
    to: network_switch
    signal: soundgrid
    cable: Cat 6
    port: Port 1
  - from: rack_iox
    to: network_switch
    signal: soundgrid
    cable: Cat 6
    port: Port 2
  - from: network_switch
    to: soundgrid_server
    signal: soundgrid
    cable: Cat 6
    port: Port 3
  - from: soundgrid_server
    to: foh_console
    signal: soundgrid
    cable: Cat 6
    notes: Server must show Assigned in LV1 Inventory
  - from: foh_console
    to: pa_processor
    signal: aes
    cable: XLR
    port: AES in 1
    notes: Main L/R and sub send
  - from: pa_processor
    to: main_pa
    signal: speaker
    cable: NL4
  - from: pa_processor
    to: subs
    signal: speaker
    cable: NL4
  - from: foh_console
    to: iem_tx
    signal: analog_line
    cable: XLR
    channel: Aux 1-8
  - from: iem_tx
    to: drummer_iem
    signal: rf
    channel: Mix 1
  - from: iem_tx
    to: vocal_iem
    signal: rf
    channel: Mix 3-6
  - from: foh_console
    to: broadcast_mac
    signal: soundgrid
    cable: Cat 6
    notes: Broadcast mix rides its own LV1 layer
`;

const DOWNTOWN_PITFALLS = `## P-001: Everything from FOH sounds glitchy or 8-bit
- nodes: [soundgrid_server, foh_console, network_switch]
- issue: The LV1 is clocking from itself instead of the SoundGrid server, usually after a power cut.
- check:
  1. On the LV1 open Setup, then Inventory, and confirm the server shows Assigned.
  2. Check Clock Master is set to the Extreme server, not Internal.
- solution: Set the clock master back to the Extreme server and re-save the show file.
- last seen: 2026-09-14 (Sam, after the Saturday power outage)

## P-002: The drummer has no click in his ears
- nodes: [playback_mac, playback_interface, stagebox_a, foh_console, iem_tx, drummer_iem]
- issue: Ableton output 3 is remapped after someone opens an older session file.
- check:
  1. In Ableton, Preferences, Audio: the output device is the Clarett+, not the Mac speakers.
  2. The click track is routed to output 3 on the Clarett.
  3. LV1 ch 15 meters move, and Aux 1 has ch 15 up.
- solution: Re-select the Clarett+ output in Ableton and route the click track to output 3.
- last seen: 2026-09-21 (Jordan, session file from Easter)

## P-003: No audio anywhere but the LV1 screen looks normal
- nodes: [soundgrid_server, network_switch, foh_console]
- issue: The SoundGrid server came up unassigned because it booted before the switch.
- check:
  1. Inventory shows the server greyed out.
  2. Switch port 3 has a link light.
- solution: Assign the server in Inventory. Next week, power the switch on before the server.
- last seen: 2026-08-31 (Sam)

## P-004: Lead vocal drops out during worship
- nodes: [vocal_rx, rack_iox]
- issue: The pack battery is low, or the frequency collides with the TV station on 584 MHz.
- check:
  1. ULXD shows fewer than 3 battery bars on the pack.
  2. The receiver RF meter flickers when the pack is near the stage edge.
- solution: Fresh batteries every service. If it still drops, scan and deploy a new group from the receiver.
- last seen: 2026-09-07 (Chris)

## P-005: Hum in the bass channel
- nodes: [bass_di, stagebox_a]
- issue: The ground lift on the bass DI was switched off.
- check:
  1. Mute the bass amp: if the hum stays on LV1 ch 9 it's the DI.
- solution: Turn the ground lift on the Radial J48 back on.
- last seen: 2026-07-20 (Jordan)
`;

const DOWNTOWN_RUNBOOK = `| # | Time | Owner | Step | Done when | If not |
|---|---|---|---|---|---|
| 1 | 7:00 | Production lead | Power on the rack conditioner, switch, then SoundGrid server | Switch ports 1-4 show link | P-003 |
| 2 | 7:05 | A1 | Start the LV1 and load the Sunday show file | Server shows Assigned in Inventory | P-001, P-003 |
| 3 | 7:15 | Playback | Open the Ableton set and play the click | Click meters on LV1 ch 15 only | P-002 |
| 4 | 7:20 | A1 | Line check drums, bass and keys | Every input lands on its labelled channel | P-005 |
| 5 | 7:30 | A1 | Fresh batteries in every vocal pack | ULXD shows 5 bars on all packs | P-004 |
| 6 | 7:40 | Monitor tech | Band in-ear check | Every musician confirms their mix | P-002 |
| 7 | 8:15 | Production lead | Walk the room during rehearsal | 92 dBA at FOH, no glitches | P-001 |

## Teardown
1. Save the LV1 show file with the date.
2. Charge every pack and IEM bodypack.
3. Power down in reverse: server, switch, then rack conditioner.
`;

const DOWNTOWN_SYSTEMS = `| System | Role | Model / version | Location | Network | Notes |
|---|---|---|---|---|---|
| Console | FOH mix | Waves eMotion LV1 v15 | FOH | SoundGrid | Show file in the Production Dropbox |
| Server | DSP | Waves Extreme Server-C | FOH rack | SoundGrid | Must be Assigned in Inventory |
| Playback | Tracks and click | Ableton Live 12 on MacBook Pro | Stage left | USB to Clarett+ | Click on out 3 |
| Wireless | Vocals | Shure ULXD4Q | Stage rack | Analog to Rack IOX | Group 2, channels 1-4 |
| IEMs | Monitors | Shure PSM1000 | Stage rack | Analog from LV1 aux | Mix 1 is the drummer |
| PA | Mains and subs | L-Acoustics Kara II, SB18, Lake LM 44 | Flown | AES from LV1 | |

## Logins and access
| System | Where the credential lives | Who has access |
|---|---|---|
| LV1 | Production 1Password vault | Production lead, A1 |
| Lake | Production 1Password vault | Production lead |
`;

const EASTSIDE_WIRING = `# Riverside Eastside: school cafeteria, set up every Sunday
nodes:
  - id: vocal_mics
    label: Vocal mics
    type: source
    group: vocals
    model: Shure SM58 x4
  - id: acoustic_di
    label: Acoustic DI
    type: source
    group: guitars
    model: Radial PZ-DI
  - id: keys_di
    label: Keys DI
    type: source
    group: keys
    model: Radial ProD2 (stereo)
  - id: playback_laptop
    label: Playback laptop
    type: playback
    group: playback
    model: MacBook Air, Ableton Live 12
  - id: stage_box
    label: Stage box
    type: stagebox
    group: stage_io
    model: Allen & Heath DX168
    location: Stage right
  - id: sq6
    label: Mixer
    type: console
    group: foh
    model: Allen & Heath SQ-6
    location: Back of the room
  - id: pa_speakers
    label: PA speakers
    type: speaker
    group: pa
    model: QSC K12.2 x2
  - id: wedges
    label: Wedges
    type: monitor
    group: monitors
    model: QSC CP8 x3
  - id: stream_pc
    label: Stream PC
    type: computer
    group: broadcast
    model: OBS on a Windows PC
edges:
  - from: vocal_mics
    to: stage_box
    signal: analog_mic
    cable: XLR
    port: In 1-4
  - from: acoustic_di
    to: stage_box
    signal: analog_mic
    cable: XLR
    port: In 5
  - from: keys_di
    to: stage_box
    signal: analog_mic
    cable: XLR
    format: stereo
    port: In 7-8
  - from: playback_laptop
    to: sq6
    signal: usb
    cable: USB Type B
    channel: USB 1-2
  - from: stage_box
    to: sq6
    signal: other
    cable: Cat 6
    notes: SLink, 60 m drum of shielded Cat 6
  - from: sq6
    to: pa_speakers
    signal: analog_line
    cable: XLR
    port: Out 1-2
  - from: sq6
    to: wedges
    signal: analog_line
    cable: XLR
    port: Out 3-5
  - from: sq6
    to: stream_pc
    signal: usb
    cable: USB Type B
    channel: USB 31-32
`;

const EASTSIDE_PITFALLS = `## P-001: Stage box shows no inputs on the mixer
- nodes: [stage_box, sq6]
- issue: The SLink cable is plugged into the DX168's second port, or the drum was kinked during load-in.
- check:
  1. SLink light on the DX168 is solid green.
  2. Setup, I/O, SLink shows the DX168.
- solution: Use port A on the DX168 and swap to the spare Cat 6 drum if the light stays off.
- last seen: 2026-09-21 (Taylor)

## P-002: Stream has no sound
- nodes: [sq6, stream_pc]
- issue: OBS picked the PC microphone instead of the SQ-6 USB audio after a Windows update.
- check:
  1. In OBS, Settings, Audio: Mic/Aux is the SQ-6.
- solution: Re-select the SQ-6 USB device in OBS and restart the stream.
- last seen: 2026-09-14 (Morgan)
`;

const EASTSIDE_RUNBOOK = `| # | Time | Owner | Step | Done when | If not |
|---|---|---|---|---|---|
| 1 | 7:30 | Setup team | Roll out cases and run the SLink drum | Cable taped down along the wall | P-001 |
| 2 | 7:45 | A1 | Power the mixer, then the stage box | DX168 shows on the SQ-6 | P-001 |
| 3 | 8:00 | A1 | Line check vocals, acoustic, keys | Every input meters | |
| 4 | 8:20 | Stream | Start OBS and check audio | Meters move in OBS | P-002 |
`;

const SHARED_LINKS = `## Waves eMotion LV1
- Link: https://www.waves.com/mixers-racks/emotion-lv1
- What to know: if the SoundGrid server is unassigned the screen keeps running but audio stops.

## Ableton Live manual
- Link: https://www.ableton.com/en/manual/

## Shure ULX-D user guide
- Link: https://www.shure.com/en-US/products/wireless-systems/ulx-d-digital-wireless

## Allen & Heath SQ support
- Link: https://www.allen-heath.com/hardware/sq/sq-6/
`;

const SHARED_GLOSSARY = `## Ears
- Technical term: In-ear monitors (IEM)
- Refers to: The Shure PSM1000 bodypacks downtown
- Description: Wireless in-ear headphones carrying each musician's monitor mix.

## Click
- Technical term: Metronome track
- Refers to: Clarett output 3 from the playback Mac
- Description: Tempo pulse sent only to in-ears, never the house.

## Tracks
- Technical term: Multitrack playback
- Refers to: The Ableton set run from stage left
- Description: Pre-recorded parts that play along with the band.

## FOH
- Technical term: Front of house
- Refers to: The mix position at the back of the room
- Description: Where the main mix is run from.

## Wedges
- Technical term: Floor monitors
- Refers to: The QSC CP8s at Eastside
- Description: Speakers on the stage floor pointed back at the band.
`;

export type DemoCampus = {
  name: string;
  slug: string;
  docs: {
    kind: "wiring" | "pitfalls" | "runbook" | "systems";
    content: string;
  }[];
};

export const DEMO_CAMPUSES: DemoCampus[] = [
  {
    name: "Downtown",
    slug: "downtown",
    docs: [
      { kind: "wiring", content: DOWNTOWN_WIRING },
      { kind: "pitfalls", content: DOWNTOWN_PITFALLS },
      { kind: "runbook", content: DOWNTOWN_RUNBOOK },
      { kind: "systems", content: DOWNTOWN_SYSTEMS },
    ],
  },
  {
    name: "Eastside",
    slug: "eastside",
    docs: [
      { kind: "wiring", content: EASTSIDE_WIRING },
      { kind: "pitfalls", content: EASTSIDE_PITFALLS },
      { kind: "runbook", content: EASTSIDE_RUNBOOK },
    ],
  },
];

export const DEMO_SHARED = [
  { kind: "links" as const, content: SHARED_LINKS },
  { kind: "glossary" as const, content: SHARED_GLOSSARY },
];

/** A draft waiting for approval, so Admin shows the review flow. */
export const DEMO_DRAFT = {
  campus: "Downtown",
  sourceTitle: "Booth notes, Sept 28",
  sourceText:
    "Second service the pastor's headset kept cutting out near the stage edge. Battery was full. Rescanned the ULXD and moved group 2 to group 4, no more dropouts. Also the broadcast mix was missing the click bleed fix, we pulled ch 15 out of the broadcast layer.",
  addition: `
## P-006: Pastor's headset cuts out near the stage edge
- nodes: [vocal_rx, rack_iox]
- issue: RF interference on ULXD group 2 near the front of the stage.
- check:
  1. Battery shows 5 bars, so it isn't power.
  2. The RF meter drops when the pack is at the stage edge.
- solution: Scan and move the receivers to group 4.
- last seen: 2026-09-28 (booth notes)
`,
  notes:
    "- Added P-006 from the Sept 28 booth notes.\n- The broadcast click note belongs in the systems doc, not pitfalls.",
};

/** Finished conversations for the Ask view. */
export const DEMO_CHATS: {
  campus: string;
  turns: { role: "user" | "assistant"; content: string; reasoning?: string }[];
}[] = [
  {
    campus: "Downtown",
    turns: [
      {
        role: "user",
        content: "The drummer has no click in his ears. What do I check first?",
      },
      {
        role: "assistant",
        reasoning:
          "The symptom matches **P-002**. The click runs playback Mac → Clarett out 3 → Stage box A In 15 → LV1 ch 15 → Aux 1 → PSM1000 Mix 1, so I'll walk it from the source.",
        content: `This is **P-002: The drummer has no click in his ears**. Check in this order, closest to the source first:

1. **Ableton output device.** Preferences → Audio. It should be the **Clarett+ 8Pre**, not the Mac speakers.
2. **Click routing.** The click track should go to **output 3** on the Clarett.
3. **On the LV1.** Channel 15 (*Click*) should be metering, and **Aux 1** should have ch 15 up.

**Fix:** re-select the Clarett+ in Ableton and route the click to output 3. Last time (Sept 21) it was an old Easter session file that remapped the outputs.

The click goes to in-ears only. Keep ch 15 out of the main mix.`,
      },
    ],
  },
  {
    campus: "Downtown",
    turns: [
      { role: "user", content: "Walk me through the Sunday setup order." },
      {
        role: "assistant",
        reasoning:
          "Reading the Downtown runbook top to bottom and attaching the pitfall for each step.",
        content: `Here's the Downtown runbook:

| Time | Who | Step | Done when |
|---|---|---|---|
| 7:00 | Production lead | Power on rack conditioner → switch → SoundGrid server | Switch ports 1-4 show link |
| 7:05 | A1 | Start the LV1, load the Sunday show | Server shows **Assigned** |
| 7:15 | Playback | Open Ableton, play the click | Meters on ch 15 only |
| 7:20 | A1 | Line check drums, bass, keys | Inputs on labelled channels |
| 7:30 | A1 | Fresh batteries in vocal packs | 5 bars on every pack |
| 7:40 | Monitor tech | Band in-ear check | Everyone confirms their mix |
| 8:15 | Production lead | Walk the room | 92 dBA at FOH |

**Order matters at 7:00.** If the server boots before the switch it comes up unassigned (P-003).`,
      },
    ],
  },
  {
    campus: "Eastside",
    turns: [
      {
        role: "user",
        content: "The stream has no sound but the room sounds fine.",
      },
      {
        role: "assistant",
        reasoning:
          "Stream audio comes from SQ-6 USB 31-32 into OBS. That's P-002.",
        content: `That's **P-002: Stream has no sound**. The room is fine, so the problem is between the **SQ-6** and **OBS**.

1. In OBS go to **Settings → Audio** and check **Mic/Aux** is the **SQ-6**, not the PC microphone.
2. Re-select it and restart the stream.

It happened after a Windows update on Sept 14.`,
      },
    ],
  },
];

/** A volunteer-reported fix waiting for an admin, attached to a chat. */
export const DEMO_FIX = {
  campus: "Downtown",
  pitfallId: "P-001",
  user: "P-001 happened again at 9am. Re-assigning the server in Inventory and setting the clock to the Extreme fixed it.",
  assistant:
    "Thanks. I've sent that to an admin to add to **P-001** so the next person sees it.",
  note: "Re-assigned the server in Inventory and set the clock master to the Extreme server.",
};
