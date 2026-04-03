# thomashadden.ai — Site Content (P1 — Research)

**Version:** 1.0  
**Date:** March 2026  
**Status:** Draft — for Thomas to review, edit, and approve  
**Usage:** Content below maps directly to the `research_items` database table.

---

## Research 1 — Bearing Fault Detection Using Wavelet Methods and Machine Learning

**Table:** `research_items`  
**Slug:** `bearing-fault-detection-wavelet`  
**Theme:** Applied AI  
**Status:** completed  
**Featured:** true  
**Sort order:** 1  

### Summary

Research into detecting roller element bearing faults using wavelet decomposition and unsupervised machine learning, eliminating the need for application-specific equipment configuration. Co-authored with Dr Muhammad Usman Hadi at Ulster University and submitted to Elsevier.

### Body

Detecting faults in roller element bearings is critical to maintaining machinery uptime in industrial environments. The established methods — time domain metrics like RMS and crest factor, frequency spectrum analysis, envelope detection — all work, but they share a common limitation: each monitoring system has to be specifically configured for the bearing type, fault frequencies, and operating conditions of every application. This setup process requires significant domain knowledge and is a real barrier to adoption, particularly for smaller operations or facilities with diverse equipment.

Thomas Hadden's research, conducted during his MSc Internet of Things at Ulster University and co-authored with Dr Muhammad Usman Hadi, investigated whether wavelet methods combined with unsupervised machine learning could detect bearing faults without any application-specific configuration.

The approach used the discrete wavelet transform (DWT) and the lifting scheme method to decompose vibration signals into approximate and detail coefficients across multiple frequency bands. Statistical markers — variance, mean, standard deviation, median, percentiles, and RMS — were calculated from these coefficients to build a feature matrix. Principal component analysis reduced the dimensionality, and the resulting features were fed into a K-Means clustering algorithm to classify fault and non-fault conditions.

The methodology was tested on two publicly available datasets that differ significantly in their characteristics: the Case Western Reserve University (CWRU) dataset, which uses artificially induced faults at known locations, and the NASA Intelligent Maintenance Systems (IMS) dataset, where faults propagated naturally through run-to-failure testing. This dual-dataset approach was deliberate — a method that only works on clean lab data with seeded faults has limited industrial value.

The method achieved 88% accuracy on the CWRU dataset and 75% on the NASA dataset. The lifting scheme was shown to produce equivalent wavelet coefficients 17.79% faster than the traditional DWT — a meaningful difference for resource-constrained edge devices and real-time monitoring applications.

The research demonstrated that wavelet-derived statistical features combined with unsupervised clustering can identify bearing fault conditions without requiring prior knowledge of bearing geometry, fault frequencies, or operating speed. This is a practical step toward condition monitoring systems that can be deployed across diverse machinery without individual tuning — a significant barrier to adoption in industry today.

The work directly informed Thomas's practical condition monitoring projects in food manufacturing and connects to his broader PhD research into AI-driven approaches for industrial process control.

**Co-author:** Dr Muhammad Usman Hadi, Ulster University  
**Affiliation:** Ulster University School of Computing / Industrial Analytics & Automation  
**Status:** Preprint submitted to Elsevier  
**Keywords:** Discrete Wavelet Transform, lifting scheme, K-Means clustering, condition-based monitoring, vibration analysis, principal component analysis, NASA IMS dataset, CWRU dataset

---

## Research 2 — AI-Driven Innovation in Industrial and Process Control Systems

**Table:** `research_items`  
**Slug:** `phd-ai-process-control`  
**Theme:** Industrial AI  
**Status:** active  
**Featured:** true  
**Sort order:** 2  

### Summary

A part-time PhD at Ulster University investigating how reinforcement learning and digital twin methodologies can be applied to real-world industrial process control, with a focus on the gap between academic theory and practical adoption in safety-critical environments.

### Body

Most academic research into AI for process control demonstrates strong theoretical performance — in simulation, on benchmark problems, under idealised conditions. But the gap between what works in a paper and what works in a live water treatment plant or manufacturing facility is substantial. Thomas Hadden's PhD research, titled AI-Driven Innovation in Industrial and Process Control Systems (AIPCon), sits directly in that gap.

The programme is a part-time PhD at Ulster University, running alongside Thomas's commercial role at Park Electrical Belfast. This dual position is deliberate — it ensures the research stays grounded in the constraints that real industrial systems impose, rather than drifting toward solutions that only work in simulation.

The research investigates two related areas: reinforcement learning for control, and digital twin methodologies for industrial process systems. The current phase is focused on a structured literature review that surveys the state of the art in both areas, paying particular attention to how proposed techniques handle the real-world constraints that academic work often overlooks — process non-linearities, measurement uncertainty, sensor limitations, safety requirements, and integration with existing PLC-based control architectures.

A key objective of the literature review is to identify and document the specific gaps between what has been published and what has actually been deployed. This includes examining why certain techniques with strong theoretical results have seen limited industrial uptake, and what engineering, regulatory, or practical barriers are responsible.

In parallel with the academic work, Thomas is developing digital twin models using Siemens Simcenter Flomaster software, applied to real NI Water infrastructure. The current application involves a 1D CFD model of the intake area of a clean water treatment plant, consisting of five Andritz VTP410 200kW pumps. The objective is to demonstrate offline a particle swarm optimisation algorithm that can schedule intake pumps more energy-efficiently than the conventional heuristic control philosophy currently in use.

If the simulation results are positive, Thomas intends to propose a live plant test with NI Water — an opportunity that would be significant both commercially (in terms of energy savings for the utility) and academically (live plant tests in this field are rare, and the work would be developed into a research paper alongside the pilot).

The PhD is supervised at Ulster University, with regular supervisory meetings, participation in research discussions, and engagement with the wider academic community. The research programme is expected to run until 2031.

**Institution:** Ulster University  
**Programme:** AIPCon — AI-Driven Innovation in Industrial and Process Control Systems  
**Qualification:** PhD (part-time)  
**Start date:** September 2025  
**Expected completion:** July 2031  
**Keywords:** reinforcement learning, digital twins, process control, Simcenter Flomaster, CFD modelling, particle swarm optimisation, PLC integration, NI Water, safety-critical systems

---

*thomashadden.ai | Industrial Analytics & Automation | P1 Research Content v1.0*