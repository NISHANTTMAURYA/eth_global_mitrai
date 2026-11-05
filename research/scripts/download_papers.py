from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request, json, hashlib
root=Path(__file__).resolve().parents[1]
items=[
('01_soar_overview_2022','Introduction to Soar','https://arxiv.org/pdf/2205.03854','2022; author preprint'),
('02_actr_soar_comparison_2022','An Analysis and Comparison of ACT-R and Soar','https://arxiv.org/pdf/2201.09305','2022; author preprint'),
('03_bdi_1995','BDI Agents: From Theory to Practice','https://cdn.aaai.org/ICMAS/1995/ICMAS95-042.pdf','1995'),
('04_memory_1991','Reflections of the Environment in Memory','https://www.cs.northwestern.edu/~paritosh/papers/KIP/AndersonSchooler1991ReflectionsOfEnvironmentOnMemory.pdf','1991'),
('05_case_based_reasoning_1994','Case-Based Reasoning: Foundational Issues, Methodological Variations, and System Approaches','https://www.iiia.csic.es/~enric/papers/AICom.pdf','1994'),
('06_ema_2009','EMA: A process model of appraisal dynamics','https://people.ict.usc.edu/~gratch/CSCI534/Readings/COGSYS-RS-EMOTION-2008-6.pdf','2009'),
('07_actr_integrated_theory_draft','An Integrated Theory of the Mind','https://www.andrew.cmu.edu/course/85-412/readings/INTEGRATED.NEW.2002%3DFINAL.pdf','2003 draft; distinguish from 2004 published version'),
('08_caps_1995','A cognitive-affective system theory of personality','https://psychology.columbia.edu/sites/default/files/2016-11/246.pdf','1995; psychological theory, not neural-free implementation'),
('09_production_compilation_2003','Production Compilation: A Simple Mechanism to Model Complex Skill Acquisition','https://www.ai.rug.nl/~niels/publications/HF-published.pdf','2003'),
('10_generative_agents_2023','Generative Agents: Interactive Simulacra of Human Behavior','https://arxiv.org/pdf/2304.03442','2023; uses neural language models'),
('11_coala_2024','Cognitive Architectures for Language Agents','https://arxiv.org/pdf/2309.02427','2024; uses neural language models')]
def get(row):
    slug,title,url,note=row
    result=dict(id=slug,title=title,url=url,note=note)
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (academic research)'})
        with urllib.request.urlopen(req,timeout=40) as r: data=r.read(); result['resolved_url']=r.url
        if not data.startswith(b'%PDF-'): raise ValueError('Response is not a PDF')
        p=root/'papers'/(slug+'.pdf'); p.write_bytes(data)
        result.update(status='downloaded',file='papers/'+p.name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
    except Exception as e: result.update(status='unavailable',error=str(e))
    return result
if __name__=='__main__':
    rows=list(ThreadPoolExecutor(max_workers=5).map(get,items))
    (root/'download_manifest.json').write_text(json.dumps(rows,indent=2)+'\n')
    for r in rows: print(r['id'],r['status'])
