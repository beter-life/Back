# Official yield fixture

`bcb-cdi-2026-01.json` fetched2026-10-05 directly from public BCB SGS12:
https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=02/01/2026&dataFinal=07/01/2026
Values are percentage per observed business day, not annual fractions. Tests
never contact BCB. All other rate fixtures are explicitly synthetic scenarios.
