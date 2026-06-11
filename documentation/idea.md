# Purpose

The purpose of this application is to be a healthcare software that is intended to improve the quality of life of the patients and to save money from the hospitals.

The application gathers data from wearable devices, diagnostic devices and questionnaires with the intention of providing the healthcare professionals a pulse/wave/status of the patient before/in between/after the visits. The pulse should contain information about the physical activities (exercise), mental health, medication/treatment follow-up, measurement trends, etc. The main UI for decision making should be extremely easy and quick to comprehend yet contain a lot of information. 

# Design principles
- The application should be simple and minimalistic with no extra features or design quirks on the user interface.. It should not seen as a standalone application but as a plugin that can be integrated into an EHR or other application. People should spend as little time in the application as possible.

# Integrations
- The application should be integratable with any EHR through Smart-On-FHIR (UI) integration
- The application should be integratable with any application through simple status API which returns the pulse of the patients.

# Customers 

Hospitals are the main customer of the application. The HCPs are the KOLs driving the adoption of the application, but the application should be attractive towards hospital management and IT department. 

# Users

## Primary
- Healthcare professionals (HCPs)
- Patients

## Secondary
- Company administrators
- Hospital administrators

# Claims

The application intends to
- Improve the happiness of the patients due to engagement and additional information provided
- Save time from unnecessary appointments / direct the resources to the most urgent cases
- Be efficient to use for HCPs
- Improve the treatment results due to timely intervention / treatment change

Secondarily, the application should
- Be easy to take into use for patients and HCPs
- Be easy to use for patients and HCPs
- Be easy to take into use for Hospital IT
- Be easy to purchase for Hospitals

# Data

This application minimizes the amount of information stored of the patients. In addition, all the data stored is pseudonymized. If possible, the application does not contain information that connects the personal identifyable information (PII) with the personal health information (PHI) or any other valuable data.

The purpose of this approach is to minimize the attack surface and GDPR consequences. 

# Data architecture

The application is multi-tenant (multiple hospitals) in a manner which allows the user to share the data with multiple hospitals. The patients are not connected to any hospitals by default, but can use the application independently. 