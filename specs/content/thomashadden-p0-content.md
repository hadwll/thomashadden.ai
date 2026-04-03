# thomashadden.ai — Site Content (P0)

**Version:** 1.0  
**Date:** March 2026  
**Status:** Draft — for Thomas to review, edit, and approve  
**Usage:** Content below maps directly to database tables. Each section notes the target table and slug.

---

## 1. About Page

**Table:** `content_pages`  
**Slug:** `about`  
**Word count:** ~620  

---

Thomas Hadden is an engineer and applied AI researcher based in Northern Ireland. He works at the intersection of industrial automation, process control, and artificial intelligence — with a focus on making these technologies practical, safe, and useful in real operational environments.

Thomas currently holds two roles. As an Application Engineer at Park Electrical Belfast, he works within the Automation Department as a Siemens specialist, delivering advanced control system design, servo drive upgrades, and automation solutions for clients across water treatment, wastewater, and process industries. He works closely with integrators, end users, and Siemens technical teams to specify, validate, and commission systems that meet demanding requirements for reliability and long-term supportability.

Alongside his role at Park, Thomas is undertaking a part-time PhD at Ulster University. The research programme — AI-Driven Innovation in Industrial and Process Control Systems (AIPCon) — investigates how reinforcement learning and digital twin methodologies can be applied to real-world process control, with a particular emphasis on the gap between academic theory and industrial adoption. Thomas Hadden's research pays close attention to the practical constraints that most academic work overlooks: process non-linearities, sensor limitations, safety requirements, and integration with existing PLC-based control architectures.

Industrial Analytics & Automation (IA&A) is Thomas's independent platform for technical projects, research-led development, and applied AI work outside his employed role. It is not a separate company in the traditional sense — it is a vehicle for the kind of work that sits between industry and academia: building things, testing ideas, and publishing findings that are grounded in real engineering problems.

Thomas Hadden's career began with a higher-level apprenticeship at Kilroot Power Station, working across high-voltage systems, fire detection upgrades, and industrial maintenance in a heavily regulated environment. From there he moved into food manufacturing at Moy Park, progressing from Electrical Maintenance Technician to Engineering Shift Manager, where he led a team of seven technicians, drove continuous improvement programmes, and headed an SAP Plant Maintenance implementation across five sites. He then spent time as a contract Automation and Controls Engineer through IA&A, delivering production-critical automation projects in food manufacturing environments before joining Park Electrical in 2023.

Academically, Thomas holds a BEng (Hons) in Mechatronic Engineering (First Class) and an MSc in Internet of Things (Distinction), both from Ulster University. He is a Member of the Institution of Engineering and Technology (MIET) and an Incorporated Engineer (IEng), working toward Chartered Engineer registration. He delivers an annual guest lecture on industrial control systems to BSc Mechatronics students at Ulster University, and has contributed to the PORTAS research project — a REPHRAIN-funded initiative using machine learning to detect indicators of human trafficking in online job advertisements.

The technical domains Thomas Hadden works across include: Siemens PLC and drive systems (S7-1200, S7-1500, S120, G120), industrial networking (SCALANCE, Profinet, Modbus), digital twin modelling (Simcenter Flomaster), reinforcement learning for control, computer vision and deep learning, condition-based monitoring, and process automation for water, wastewater, and food manufacturing environments.

This site exists to share that work — the projects, the research, and the practical thinking that connects AI to industry. If you are a business owner wondering where AI fits, an integrator looking for technical support, or a researcher interested in collaboration, Thomas is interested in that conversation.

---

## 2. Homepage Copy

**Table:** `content_pages`  
**Slug:** `home`  

### 2.1 About Teaser (Desktop Homepage)

**Section:** AboutTeaser  
**Word count:** ~90  

Thomas Hadden is an engineer and applied AI researcher based in Northern Ireland. He works at Park Electrical Belfast as a Siemens automation specialist, delivering control system upgrades and technical solutions for water treatment and process industries. Alongside his commercial role, he is undertaking a part-time PhD at Ulster University, investigating how AI and digital twin technologies can be applied to real-world industrial control. Industrial Analytics & Automation is his independent platform for technical projects and research.

### 2.2 LLM Answer Preview — Card 1 (Static, Desktop + Mobile)

**Question:** "How can AI help an engineering business?"

**Answer preview:**
- Automate repetitive reporting, data entry, and compliance documentation
- Improve quality control through computer vision and predictive analytics
- Optimise scheduling, resource allocation, and energy consumption
- Analyse operational data to identify cost savings and efficiency gains
- Enhance maintenance planning with condition-based monitoring
- Support faster, better-informed decision-making with real-time dashboards

### 2.3 LLM Answer Preview — Card 2 (Mobile Carousel)

**Question:** "What is Thomas working on?"

**Answer preview:**
- Leading servo drive upgrade projects for wastewater treatment equipment at Park Electrical
- Researching reinforcement learning and digital twins for industrial process control as part of a PhD at Ulster University
- Developing CFD models and pump optimisation algorithms for NI Water infrastructure
- Building applied AI tools through Industrial Analytics & Automation
- Delivering annual guest lectures on industrial control systems to university students

### 2.4 LLM Answer Preview — Card 3 (Mobile Carousel)

**Question:** "Where does AI fit into industry?"

**Answer preview:**
- Predictive maintenance — detecting equipment degradation before failure
- Process optimisation — reducing energy use and improving throughput
- Quality assurance — automated inspection using computer vision
- Supply chain and scheduling — smarter resource planning
- Compliance and reporting — automated documentation and audit trails
- Knowledge capture — preserving operational expertise as experienced staff retire

---

## 3. Project 1 — Servo Drive Upgrade for Wastewater Treatment

**Table:** `projects`  
**Slug:** `servo-drive-upgrade-wastewater`  
**Category:** Industrial Automation  
**Status:** completed  
**Location:** Northern Ireland  
**Featured:** true  
**Sort order:** 1  

### Summary

A full servo control system upgrade on an automated sludge press used in wastewater treatment, replacing an obsolete Siemens 611U platform with a modern S120 drive system. The project was delivered through Park Electrical Belfast for an NI Water integrator client.

### Body

The existing servo system on the sludge press was based on a legacy Siemens 611U platform that had reached end of life. Spare parts were no longer available, and the client faced increasing risk of unplanned downtime on a machine critical to their wastewater treatment process.

Thomas Hadden took technical ownership of the upgrade from assessment through to commissioning. The first step was to extract and review the existing drive parameters and control behaviour, then specify suitable replacement servo motors and design a complete upgrade path to the Siemens S120 modular drive platform.

To reduce commissioning risk on what was a production-critical machine, Thomas recreated as much of the original control environment as possible within the Park Electrical workshop — including PLC, HMI, and servo drives. This allowed functional testing and validation of control behaviour before anything was installed on the live machine.

As part of the upgrade, Thomas introduced an interim Siemens S7-1500 PLC to manage the servo axes using Siemens Technology Objects. This enabled more structured axis handling, including automatic axis alignment prior to movement and improved jog behaviour with variable speed based on operator input duration. These changes improved both operator usability and motion control precision.

The physical upgrade was carried out during a planned one-week maintenance window. Thomas led the electrical modifications and software integration, working closely with the site engineer and an external mechanical contractor. Following recommissioning, he led the fault-finding and optimisation phase to resolve integration issues and stabilise operation under production conditions.

The initial project scope was approximately £30,000. Following successful delivery, the same client commissioned Park Electrical to upgrade ancillary systems on the same plant and to deliver a full control upgrade — including PLC, HMI, and a six-axis drive system — on a second machine. The combined project value reached £110,000.

**Technologies:** Siemens S120 servo drives, Siemens S7-1500 PLC, Siemens S7-300 (legacy integration), TIA Portal, Startdrive, Siemens Technology Objects, HMI design.

---

## 4. Project 2 — Automatic Licence Plate Recognition System

**Table:** `projects`  
**Slug:** `alpr-vehicle-tracking`  
**Category:** Applied AI  
**Status:** completed  
**Location:** Northern Ireland  
**Featured:** true  
**Sort order:** 2  

### Summary

A bespoke Automatic Licence Plate Recognition (ALPR) system designed and built for a waste management and land regeneration business, combining edge computing, solar power management, cloud-based plate recognition, and automated compliance reporting. No suitable off-the-shelf solution existed for the operational constraints.

### Body

The client operated licensed disposal of greenfield and construction waste across multiple sites. Individual projects involved several hundred to over a thousand vehicle movements, making manual record-keeping impractical, error-prone, and a compliance risk.

No commercially available ALPR system met the site constraints: remote locations without mains power, variable lighting conditions, and the need for fully autonomous operation with minimal operator intervention. Thomas Hadden designed and implemented a non-standard solution from the ground up.

The hardware platform integrated an 8-megapixel Hikvision camera triggered by a PLC-connected sensor, with off-grid solar power management via a Modbus-connected charge controller. The system included battery monitoring and automatic generator start when energy reserves fell below defined thresholds — ensuring continuous operation regardless of weather or season.

Captured images were processed using JavaScript and Node-RED, then transmitted to a cloud-based ALPR API for plate recognition. Results were returned to the system, stored in a local SQLite database, and processed via FTP, VBA, and Excel to generate automated weekly compliance and billing reports distributed by email.

Beyond the technical delivery, Thomas coordinated the environmental compliance dimension of the project, engaging an environmental engineer to support waste exemption applications and regulatory submissions to the Northern Ireland Environment Agency. The technical system design had to align with regulatory reporting requirements and operational auditability.

The system operated autonomously and reliably across multiple sites, eliminating manual vehicle logging and providing auditable records for both billing and regulatory compliance.

**Technologies:** Hikvision IP cameras, PLC sensor triggering, Modbus charge controllers, Node-RED, JavaScript, cloud ALPR API, SQLite, VBA/Excel reporting, off-grid solar power systems, FTP automation.

---

## 5. Project 3 — Date Code Vision System

**Table:** `projects`  
**Slug:** `date-code-vision-classifier`  
**Category:** AI & Computer Vision  
**Status:** completed  
**Location:** Northern Ireland  
**Featured:** true  
**Sort order:** 3  

### Summary

A deep learning vision system built to classify date codes on packaging in a live food manufacturing environment, using a convolutional neural network running on a Raspberry Pi. Developed as an MSc project at Ulster University and designed to solve a real quality control problem that had cost the business tens of thousands of pounds.

### Body

In food manufacturing, incorrect date codes printed on packaging due to operator entry errors are a serious quality issue. Each incident can result in product recalls, retailer fines, and significant financial loss — in some cases tens of thousands of pounds per occurrence. Thomas Hadden chose this as the engineering problem for his MSc Internet of Things project at Ulster University, opting to solve a genuine workplace issue rather than an academic exercise.

The solution used deep learning to classify dot-matrix printed date codes on packaging as it moved along a conveyor line. Thomas designed the system to capture images, perform preprocessing, and run inference against a trained model — raising an alarm to the operator if the date fell outside the expected range.

Thomas built the training dataset by collecting and labelling images of printed date codes from the production line, then developed and trained a custom convolutional neural network (CNN) in Python using TensorFlow. The model was trained on a desktop machine and deployed to a Raspberry Pi for edge inference.

The project encountered real-world engineering challenges. TensorFlow required a 64-bit operating system, but the specified camera module only supported 32-bit. Thomas adapted by using a USB webcam, though this introduced image clarity challenges — particularly with product in motion on the conveyor. These compromises and their impact on classification accuracy were documented and evaluated as part of the project.

The project received a mark of 85% and generated interest from the manufacturing business in developing the system into a full industrial solution. Thomas published the code to GitHub and identified Docker containerisation as an improvement for future deployability — a technique he subsequently adopted in later projects.

The project demonstrated that applied AI can address genuine manufacturing quality problems using low-cost hardware, and that the gap between academic prototypes and production-ready systems is primarily an engineering challenge rather than a theoretical one.

**Technologies:** Python, TensorFlow, convolutional neural networks (CNN), Raspberry Pi, computer vision, image preprocessing, edge inference, Docker (identified for future iteration).

---

*thomashadden.ai | Industrial Analytics & Automation | P0 Content v1.0*