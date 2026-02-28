# Server recommendation for KOL backend

**Use case:** 10 simultaneous users, 1000–1500 active users. Backend ~50% complete; more features planned.

---

## Which plan to pick

| Plan | Verdict |
|------|--------|
| **Cost-Optimized** | ❌ Skip. Variable CPU and older hardware can hurt as you add code and load. |
| **Regular Performance** | ✅ **Recommended.** Best price/performance, medium traffic, good for a growing app. |
| **General Purpose** | ✅ Use if you need predictable, “always high” CPU and treat this as critical production. |

**Short answer:** Start with **Regular Performance**. Move to **General Purpose** when:
- You need **stable CPU 24/7** (no sharing, predictable performance), or  
- Traffic grows past medium: e.g. **50+ concurrent** or **5k+ active users**.

---
General Purpose: Consider it when you need stable CPU 24/7 or when traffic grows (e.g. 50+ concurrent, 5k+ active).
## Suggested configuration

| Resource | Minimum | Comfortable (growth) |
|----------|---------|----------------------|
| **vCPU** | 2 | 4 |
| **RAM** | 2 GB | 4 GB |
| **Storage** | 20 GB SSD | 40 GB SSD |

- **10 simultaneous + 1000–1500 active:** 2 vCPU / 2 GB RAM is enough to start.
- **Adding more code and features:** Prefer **4 vCPU / 4 GB RAM** so you have headroom.

---

## Summary

- **Plan:** Regular Performance (x86 AMD).  
- **Config:** 2–4 vCPU, 2–4 GB RAM, 20–40 GB SSD.  
- **Upgrade to General Purpose when:** (1) You need stable, dedicated CPU 24/7, or (2) traffic grows to 50+ concurrent / 5k+ active users.
