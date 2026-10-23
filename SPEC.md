# 🌐 CYBERSCAPE — The Digital Twin of the Internet

> **A living 3D map of the Internet's physical nervous system. See every submarine cable, data center, IXP, BGP route, CDN edge, DNS root, AS relationship. Watch packets flow. See attacks happen. Witness the internet breathe.**

---

## 🌐 The Vision

**CyberScape** is the **digital twin of the Internet's physical infrastructure** — a photorealistic 3D globe showing the Internet's *physical nervous system* in real-time. Not a network map — a **living digital twin** of the Internet's body.

---

## 🎮 The Experience

### The Globe View (CesiumJS + Custom Shaders)
A **photorealistic 3D globe** where the Internet *is* the terrain:
- **Submarine cables** — glowing fiber arcs along great-circle paths, thickness = capacity, color = owner/consortium, pulsing = live traffic
- **Landing stations** — glowing nodes, size = capacity, click → facility details
- **Data centers** — 3D buildings (extruded from footprints), glowing fiber entries, power/cooling visualizations
- **IXPs** — glowing hubs, particle flows = peerings, size = throughput
- **CDN edges** — edge nodes glowing, particle streams = content delivery
- **BGP** — animated great-circle arcs between ASes, thickness = prefixes, color = relationship
- **Traffic** — animated particle flows along cables/paths, color = protocol, speed = latency
- **Attacks** — red pulsing waves (DDoS), red lightning (BGP hijack), red pulses (cable cut)

### The Cable Explorer
Click any submarine cable → **Cable Inspector**: Topology, Capacity, Ownership, Latency, Resilience, History, Economics, Risk

### The Data Center Explorer
Click any data center → **Facility Inspector**: Physical, Power, Cooling, Connectivity, Tenants, Certifications, Power, Network

### The IXP Explorer
Click any IXP → **Exchange Inspector**: Participants, Traffic, Switch fabric, Route servers, PeeringDB, Peering Matrix

### The BGP Live View
**Real-time BGP table** (800k+ prefixes, 70k+ ASes): Animated updates, Hijack detection, Leak detection, RPKI validation, AS Path visualization, Prefix timeline, AS Relationship inference

### The Attack Theater
**Real-time attack visualization:** DDoS (volumetric/app), BGP Hijacks, Route Leaks, Cable Cuts, BGPsec/ROA

### The Resilience Simulator
**What-if scenarios** with visual simulation: Cable cut, IXP outage, Data center failure, BGP hijack, DDoS attack, Root server outage

---

## 🛰️ Data Sources (All Real-Time / Near-Real-Time)
| Domain | Sources | Frequency | Auth |
|--------|---------|-----------|------|
| Submarine Cables | TeleGeography, Submarine Cable Map, operator APIs | Daily | 🟢 |
| Landing Stations | TeleGeography, operator sites, PeeringDB | Daily | 🟢 |
| Data Centers | DataCenterMap, CloudScene, operator APIs, PeeringDB | Daily | 🟡 |
| IXPs | PeeringDB, Euro-IX, APIX, LAC-IX, Af-IX, API | Hourly | 🟢 |
| BGP | RIPE RIS, RouteViews, BGPStream, RIPEstat, BGPalerter | Real-time | 🟢 |
| RPKI/ROA | RIPE RPKI Validator, RPKI.net, ARIN/RIPE/APNIC/LACNIC/AfriNIC | Real-time | 🟢 |
| AS Relationships | CAIDA AS Rel, RIPE AS Rel, BGPStream | Daily | 🟢 |
| CDN Edges | Cloudflare, Fastly, CloudFront, Akamai, Google | Daily | 🟡 |
| DNS | Root zone, ICANN CZDS, RIPE NCC, Verisign, CIRA | Daily | 🟢/🟡 |
| Traffic/NetFlow | RIPE NCC, CAIDA, Kentik, sFlow/NetFlow collectors | 5-min | 🟡 |
| DDoS | Cloudflare Radar, Radware, Arbor NETSCOUT | Real-time | 🟡 |
| Cable Cuts | SubCableWorld, operator announcements, news APIs | Real-time | 🟢 |

---

## 🧠 The Intelligence Layer
- **Anomaly Detection**: BGP hijacks/leaks, DDoS, routing anomalies, infrastructure failures, DNS anomalies
- **Attribution Engine**: Threat actor profiling, infrastructure mapping, campaign tracking
- **Predictive Intelligence**: Cable risk scoring, congestion prediction, failure cascades, capacity forecasting

---

## 🎮 The Interface
- **Globe View** (CesiumJS + Custom WebGL Shaders): Photorealistic 3D globe, custom shaders for cables/DCs/IXPs, time control, layers
- **Network Explorer**: AS Explorer, Prefix Explorer, Cable Explorer, DC Explorer, IXP Explorer
- **Analyst Workbench**: Query Builder, Alert Builder, Dashboard Builder, Report Builder
- **AI Analyst**: Natural language queries, anomaly explanation, impact analysis, scenario planning

---

## 🏗️ Architecture
```
CyberScape/
├── client/                    # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # Globe, Panels, Inspectors, Simulator
│   │   ├── layers/            # Cable, DC, IXP, BGP, Traffic, Attack
│   │   ├── shaders/           # Cable arcs, traffic particles, attack effects
│   │   ├── analyzer/          # BGP analyzer, traffic analyzer
│   │   ├── simulator/         # Resilience simulator
│   │   └── ai/                # AI analyst, anomaly explainer
├── server/                    # FastAPI + Go (BGP) + Node.js
│   ├── bgp/                   # BGP collector (GoBGP/BGPStream)
│   ├── stac/                  # STAC API for infrastructure metadata
│   ├── graph/                 # NetworkX/Neo4j (AS graph, cable topology)
│   ├── inference/             # Anomaly detection, attribution
│   ├── simulator/             # Resilience simulator (ns-3/custom)
│   ├── cache/                 # Redis (BGP, traffic, alerts)
│   └── auth/                  # Auth, quotas, billing
├── data-pipeline/             # Dagster/Airflow
│   ├── ingestion/             # BGP (BGPStream), PeeringDB, TeleGeography, RIPE
│   ├── processing/            # Graph building, anomaly detection
│   ├── enrichment/            # GeoIP, ASN, organization, risk scoring
│   └── publishing/            # Vector tiles (PMTiles), STAC, API
├── ml/                        # ML models
│   ├── anomaly/               # BGP anomaly, traffic anomaly
│   ├── attribution/           # Threat actor clustering
│   ├── prediction/            # Cable risk, congestion, cascade
│   └── simulation/            # Cascade simulation (GNN)
└── infra/                     # Terraform
    ├── k8s/                   # EKS/GKE (collectors, APIs, inference)
    ├── streaming/             # Kafka/Redpanda (BGP, NetFlow, sFlow)
    ├── database/              # TimescaleDB (time-series), Neo4j (graph)
    └── monitoring/            # Prometheus, Grafana, Sentry
```

---

## 💰 Business Model
| Tier | Price | Features |
|------|-------|----------|
| **Observer** | Free | Globe, 5 AS queries/day, 5 cable views, 10 alerts |
| **Analyst** | $99/mo | Unlimited queries, 100 alerts, API, exports, history |
| **Team** | $499/mo | 5 seats, collaboration, custom alerts, webhooks |
| **Enterprise** | Custom | SSO, on-prem, dedicated collectors, SLA, custom collectors |

---

## 🚀 Roadmap
| Phase | Milestone | Target |
|-------|-----------|--------|
| **v0.1** | Globe + submarine cables + landing stations + basic BGP | Q1 2025 |
| **v0.2** | Data centers + IXPs + CDN edges + BGP live view | Q2 2025 |
| **v0.3** | Traffic visualization + DDoS/BGP attack visualization | Q3 2025 |
| **v1.0** | Resilience simulator + AI analyst + API | Q1 2026 |
| **v1.5** | Predictive intelligence, cascade simulation | Q3 2026 |
| **v2.0** | Digital twin API, custom collectors, on-prem | Q1 2027 |

---

## 🎯 Why This Wins
1. **First Digital Twin of the Internet** — No one has a *photorealistic 3D globe* of the Internet's physical layer
2. **Real-Time + Historical** — Live BGP + 20-year history + predictive
3. **Attack Theater** — First *visual* attack theater (DDoS, BGP hijacks, cable cuts)
4. **Resilience Simulator** — First *visual* what-if simulator for Internet infrastructure
5. **Viral** — "Watch a BGP hijack happen in 3D" → security Twitter explosion
6. **Enterprise TAM** — ISPs, CDNs, cloud providers, financial (latency arbitrage), enterprise (resilience), gov/defense, insurance
7. **Moat** — Real-time BGP + submarine cable topology + 3D globe + simulation = massive moat

---

## 📜 License
MIT — Open source core, commercial SaaS on top.

---

*"The Internet has a body. CyberScape gives it eyes."*