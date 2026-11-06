# Local research library

13 distinct full-text papers downloaded (the original eleven plus the two additions below) from public author, university, publisher or arXiv sources. PDFs were parsed to check page counts and opening titles. Relevant passages were inspected; no claim that every page was read or that this is a systematic review. Extracted text is included for search.

The brain design is an engineering synthesis in [brain-spec](../docs/brain-spec.md). Two papers explicitly require LLMs; they do not satisfy a strict neural-free system requirement. The remaining papers cover symbolic cognition, numerical mechanisms and psychological theory with differing assumptions.

## 01_soar_overview_2022

**Introduction to Soar** — 2022; author preprint. 29 pages.

[Local PDF](papers/01_soar_overview_2022.pdf) · [Original download](https://arxiv.org/pdf/2205.03854)

Symbolic architecture: working/semantic/episodic memory and chunking. Use a small subset; full Soar also has numerical learning modules.

## 02_actr_soar_comparison_2022

**An Analysis and Comparison of ACT-R and Soar** — 2022; author preprint. 18 pages.

[Local PDF](papers/02_actr_soar_comparison_2022.pdf) · [Original download](https://arxiv.org/pdf/2201.09305)

Compare architectural data and metadata. The PDF reports 2021 conference publication; the arXiv upload is 2022. Use this to avoid treating a JSON state as the whole cognitive engine.

## 03_bdi_1995

**BDI Agents: From Theory to Practice** — 1995. 8 pages.

[Local PDF](papers/03_bdi_1995.pdf) · [Original download](https://cdn.aaai.org/ICMAS/1995/ICMAS95-042.pdf)

Beliefs, desires and intentions separate knowledge from selected commitments. Supplies control, not a complete emotional personality.

## 04_memory_1991

**Reflections of the Environment in Memory** — 1991. 14 pages.

[Local PDF](papers/04_memory_1991.pdf) · [Original download](https://www.cs.northwestern.edu/~paritosh/papers/KIP/AndersonSchooler1991ReflectionsOfEnvironmentOnMemory.pdf)

Recency, frequency and spacing affect accessibility. Motivation for ranked retrieval; decay need not delete a stored record.

## 05_case_based_reasoning_1994

**Case-Based Reasoning: Foundational Issues, Methodological Variations, and System Approaches** — 1994. 27 pages.

[Local PDF](papers/05_case_based_reasoning_1994.pdf) · [Original download](https://www.iiia.csic.es/~enric/papers/AICom.pdf)

Retrieve/reuse/revise/retain prior cases. Choose explicit feature matching; the survey also covers connectionist methods.

## 06_ema_2009

**EMA: A process model of appraisal dynamics** — 2009. 21 pages.

[Local PDF](papers/06_ema_2009.pdf) · [Original download](https://people.ict.usc.edu/~gratch/CSCI534/Readings/COGSYS-RS-EMOTION-2008-6.pdf)

Appraisal of goal-relative situations drives emotional changes. Keep mood distinct from durable identity. Domain-model assumptions constrain generality.

## 07_actr_integrated_theory_draft

**An Integrated Theory of the Mind** — 2003 draft; distinguish from 2004 published version. 78 pages.

[Local PDF](papers/07_actr_integrated_theory_draft.pdf) · [Original download](https://www.andrew.cmu.edu/course/85-412/readings/INTEGRATED.NEW.2002%3DFINAL.pdf)

Local file is a January 2003 draft, not the final 2004 journal article. Modules communicate via buffers and production rules, with numerical activation metadata.

## 08_caps_1995

**A cognitive-affective system theory of personality** — 1995; psychological theory, not neural-free implementation. 23 pages.

[Local PDF](papers/08_caps_1995.pdf) · [Original download](https://psychology.columbia.edu/sites/default/files/2016-11/246.pdf)

Situation-dependent behavioral signatures. Conceptual personality reference; CAPS includes interacting activation ideas and must not be advertised as a ready-made neural-free engine.

## 09_production_compilation_2003

**Production Compilation: A Simple Mechanism to Model Complex Skill Acquisition** — 2003. 16 pages.

[Local PDF](papers/09_production_compilation_2003.pdf) · [Original download](https://www.ai.rug.nl/~niels/publications/HF-published.pdf)

Taatgen and Lee, Human Factors 45(1), 61–76, 2003. Composing/specializing procedures explains modeled skill acquisition. MVP uses conservative whitelist habits, not unrestricted rule synthesis.

## 10_generative_agents_2023

**Generative Agents: Interactive Simulacra of Human Behavior** — 2023; uses neural language models. 22 pages.

[Local PDF](papers/10_generative_agents_2023.pdf) · [Original download](https://arxiv.org/pdf/2304.03442)

Park et al., UIST 2023: memory, planning and reflection in a sandbox. Explicitly LLM/embedding-based; comparison for conversational layer only.

## 11_coala_2024

**Cognitive Architectures for Language Agents** — 2024; uses neural language models. 32 pages.

[Local PDF](papers/11_coala_2024.pdf) · [Original download](https://arxiv.org/pdf/2309.02427)

Sumers et al., TMLR 2024: modular memory and internal/external actions. Explicitly an LLM architecture; comparison only.

## Additional references from the original review

The original idea.md also cites Bates (1994), the Soar 1987 paper, Roberts et al. (2006), and FAtiMA Modular (2014). Those exact full-text files are not in this downloaded set. FAtiMA’s university record restricts file access; use its abstract with that limitation. These are not counted toward the 11 local papers.

## Reproducibility and rights

`download_manifest.json` records URLs, sizes, SHA-256 hashes and page counts. `scripts/download_papers.py` repeats downloads; sources may change or disappear. Files are local research copies, not relicensed assets. Retain attribution and check individual reuse conditions before redistributing them in a public code repository.


## 12_longmemeval_2025

**LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory** — ICLR 2025.
[Local PDF](papers/12_longmemeval_2025.pdf) · [Primary source](https://arxiv.org/abs/2410.10813)
Research reference for dated evidence, corrections, cross-session retrieval and abstaining when recall is insufficient. This implementation is not benchmarked on LongMemEval.

## 13_proactive_dialogue_2024

**Redefining Proactivity for Information Seeking Dialogue** — 2024.
[Local PDF](papers/13_proactive_dialogue_2024.pdf) · [Primary source](https://arxiv.org/abs/2410.15297)
Research reference for context-relevant initiative, follow-up questions and useful additional information. Conversation length alone does not validate useful or welcome outreach. HTML methods and limitations were reviewed; no full-paper reproduction is claimed.
