---
title: README
---
För fullständiga parametrar se search i https://jobsearch.api.jobtechdev.se/

# Regions.py

Allting ges egentligen i några konstiga koder, jag har försökt få fram listor på de här koderna och det går via jobbtechdev taxonomy atlas att få fram koder på region och kommun. Men det var svindrygt och kasst så jag gjorde en dict i regions.py så man bara kan fylla i regioner i inställningarna och det översätts av en hjälpfunktion till de korrekta koderna.
Inte gjort det för kommuner så där måste man kolla upp koder själv. Tar man koderna genom att söka på arbetsförmedlingen så skrivs de i URLn efter nivå. Där nivå 2 är region och nivå 3 är kommun. Dvs region 1 är land.

# Exempel json

q är en frisöksparameter där den kommer försöka matcha ordet 
limit är hur många svar du får per sida. 50 är det jag har utgått ifrån lite godtyckligt tror jag, kan ha varit övre gräns.
trainee är standard false. bara med som exempel här. Och i municipality så får man en lista med koder. Att söka på Leksand i enligt deras taxonomi är samma sak som att hitta alla jobb i Leksand genom att söka på dalarna som region. Men det kan finnas jobb som inte är korrekt kodade i deras databas som innehåller fritextordet leksand, så för fullständighet kan det vara bra ibland söka på Leksand som fritext också.

{
        "region": "Dalarna, Ostergotland, Orebro, Jonkoping, Sodermanlan, Vastmanland, Gavleborg", 
        "q": "ekonom ekonomi strateg verksamhetsutvecklare",
        "offset": 0,
        "municipality": ["7Zsu_ant_gcn", "Ny2b_2bo_7EL"], 
        "trainee": "false",
        "limit": 50
}

# Json header
i funktionen fetch_jobs() så skickas en json header med  där man beskriver om mellanrum ska tolkas som och eller eller och om deras ai ska hjälpa till med sök. som standard är det här avstängt för att deras söktjänst är kass och bara utgår från första ordet i frisöksparametern "q".


# Filtreringsfunktionen bad_keywords.txt

För att det ibland kommer med helt irrelevanta jobbannonser så har jag ett filter med nyckelord. Fyll på eller ta bort som du känner för.


