const CARSPECS = [
  { image: "1. SUGO/asurada_gsx.png", acceleration: 4.8, handling: 0.7, hasAero: false, hasBoost: true, turn: "none", driver: "Kazami"},
  { image: "1. SUGO/Asurada_GSX_Rally.png", acceleration: 4.8, handling: 0.7 , hasAero: false, hasBoost: true, turn: "none", driver: "Kazami"},
  
  { image: "1. SUGO/Super_Asurada_01.png", acceleration: 5.1, handling: 0.8 , hasAero: true, hasBoost: true, turn: "none", driver: "Kazami"},
  { image: "1. SUGO/S-Asurada-AKF-11.png", acceleration: 5.25, handling: 0.7 , hasAero: true, hasBoost: true, turn: "none", driver: "Kazami"},
  { image: "1. SUGO/n-Asurada_AKF-0_G.png", acceleration: 5.3, handling: 0.7 , hasAero: true, hasBoost: true, turn: "lift", driver: "Kazami"},
  { image: "1. SUGO/n-Asurada_AKF-0_G_A.png", acceleration: 5.3, handling: 0.7 , hasAero: false, hasBoost: true, turn: "lift", driver: "Asuka"},
  { image: "1. SUGO/Vision-Asurada.png", acceleration: 5.2, handling: 0.7 , hasAero: true, hasBoost: true, turn: "lift", driver: "Kazami"},
  
  { image: "1. SUGO/Garland_Kazami.png", acceleration: 5.25, handling: 0.8 , hasAero: false, hasBoost: false, turn: "none", driver: "Kazami"},
  { image: "1. SUGO/Garland_Henri.png", acceleration: 5.2, handling: 0.8 , hasAero: false, hasBoost: false, turn: "none", driver: "Henri"},

  { image: "2. AOI/Superion_GT.png", acceleration: 4.8, handling: 0.7 , hasAero: false, hasBoost: true, turn: "none", driver: "Shinjo"},
  { image: "2. AOI/Ex-Superion_ZA-8_Shinjo.png", acceleration: 5.1, handling: 0.75 , hasAero: true, hasBoost: true, turn: "none", driver: "Shinjo"},
  
  { image: "2. AOI/Stealth Jaguar Z-7.png", acceleration: 4.7, handling: 0.7 , hasAero: false, hasBoost: false, turn: "none", driver: "Kaga"},
  { image: "2. AOI/Stealth Jaguar Z-7B.png", acceleration: 4.75, handling: 0.75 , hasAero: false, hasBoost: false, turn: "none", driver: "Kaga"},

  { image: "2. AOI/Experion_ZA-8_Kaga.png", acceleration: 4.9, handling: 0.8 , hasAero: true, hasBoost: true, turn: "none", driver: "Kaga"},
  { image: "2. AOI/Ogre.png", acceleration: 5.35, handling: 0.95 , hasAero: true, hasBoost: true, turn: "mirage", driver: "Kaga"},
  
  { image: "2. AOI/Al-Zard NP-1.png", acceleration: 5.2, handling: 0.75 , hasAero: true, hasBoost: true, turn: "none", driver: "Phil"},
  { image: "2. AOI/Al-Zard NP-1_B.png", acceleration: 5.1, handling: 0.75 , hasAero: true, hasBoost: true, turn: "none", driver: "Nagumo"},
  { image: "2. AOI/Al-Zard NP-1_Kaga.png", acceleration: 5.1, handling: 0.75 , hasAero: true, hasBoost: true, turn: "none", driver: "Kaga"},  
  { image: "2. AOI/Al-Zard NP-2.png", acceleration: 5.25, handling: 0.75 , hasAero: true, hasBoost: true, turn: "special", driver: "Shinjo"},
  
  { image: "2. AOI/EX-zard_ZA-11_Kaga.png", acceleration: 5.3, handling: 0.8 , hasAero: true, hasBoost: true, turn: "special", driver: "Kaga"},
  { image: "2. AOI/EX-zard_ZA-11_Shiba.png", acceleration: 5.3, handling: 0.8 , hasAero: true, hasBoost: true, turn: "special", driver: "Shiba"},
  { image: "2. AOI/EX-zard_ZA-11_B.png", acceleration: 5.3, handling: 0.8 , hasAero: true, hasBoost: true, turn: "special", driver: "Shinjo"},
  
  { image: "2. AOI/Experion_ZA-8_Shoemach.png", acceleration: 5.0, handling: 0.88 , hasAero: true, hasBoost: true, turn: "none", driver: "Shoemach"},
  { image: "3. UNION SAVIOR/Knight_Saber.png", acceleration: 4.9, handling: 0.82 , hasAero: false, hasBoost: false, turn: "none", driver: "Shoemach"},
  
  { image: "3. UNION SAVIOR/Issuxark_00-X.png", acceleration: 4.7, handling: 0.8 , hasAero: false, hasBoost: true, turn: "none", driver: "Randoll"},
  { image: "3. UNION SAVIOR/Issuxark_00-X3_II_Randoll.png", acceleration: 5.0, handling: 0.8 , hasAero: false, hasBoost: true, turn: "special", driver: "Randoll"},
  { image: "3. UNION SAVIOR/Issuxark_00-X3_II_Shinjo.png", acceleration: 5.1, handling: 0.8 , hasAero: false, hasBoost: true, turn: "special", driver: "Shinjo"},
  
  { image: "4. STORMZENDER/Stil_HG-161.png", acceleration: 4.8, handling: 0.95 , hasAero: false, hasBoost: false, turn: "none", driver: "Heinel"},
  { image: "4. STORMZENDER/Stil_HG-162.png", acceleration: 4.8, handling: 0.95 , hasAero: false, hasBoost: false, turn: "none", driver: "Gudelhian"},
  { image: "4. STORMZENDER/Stil_HG-164.png", acceleration: 4.9, handling: 0.95 , hasAero: false, hasBoost: false, turn: "none", driver: "Heinel"},
  { image: "4. STORMZENDER/Stil_HG-165.png", acceleration: 4.9, handling: 0.95 , hasAero: false, hasBoost: false, turn: "none", driver: "Gudelhian"},
  { image: "4. STORMZENDER/SPIEGEL_HP-022.png", acceleration: 5.0, handling: 0.95 , hasAero: true, hasBoost: false, turn: "special", driver: "Gudelhian"}, 
  { image: "4. STORMZENDER/SPIEGEL_HP-022_2.png", acceleration: 5.05, handling: 0.95 , hasAero: true, hasBoost: false, turn: "special", driver: "Luisa"},  
  { image: "4. STORMZENDER/SPIEGEL_HP-022_B.png", acceleration: 5.0, handling: 0.95 , hasAero: false, hasBoost: false, turn: "none", driver: "Heinel"}, 
  
  { image: "5. MISSING LINK/MISSIONNEL_VR-4.png", acceleration: 4.7, handling: 0.7 , hasAero: false, hasBoost: false, turn: "none", driver: "Bootsvorz"},  
  { image: "5. MISSING LINK/STRATMISSIONNEL_MS-3.png", acceleration: 4.8, handling: 0.8 , hasAero: false, hasBoost: false, turn: "none", driver: "Bootsvorz"},
  { image: "5. MISSING LINK/Asurada_GST.png", acceleration: 4.8, handling: 0.8 , hasAero: false, hasBoost: false, turn: "none", driver: "Osamu"},  
  
  { image: "6. OTHERS SINGLE RACER/Albatrander_602.png", acceleration: 4.6, handling: 0.7 , hasAero: false, hasBoost: false, turn: "none", driver: "Otomo"},
  { image: "6. OTHERS SINGLE RACER/EL-CONDOL_B-15.png", acceleration: 4.5, handling: 0.7 , hasAero: false, hasBoost: false, turn: "none", driver: "Lopes"},
  { image: "6. OTHERS SINGLE RACER/SILENT_SCREAMER-β.png", acceleration: 4.6, handling: 0.7 , hasAero: false, hasBoost: false, turn: "none", driver: "Heinel"},
  { image: "6. OTHERS SINGLE RACER/Stampede_RS.png", acceleration: 4.7, handling: 0.7 , hasAero: false, hasBoost: false, turn: "none", driver: "Gudelhian"},
  { image: "6. OTHERS SINGLE RACER/Advanced_Phoenix.png", acceleration: 5.3, handling: 0.8 , hasAero: true, hasBoost: true, turn: "special", driver: "Toma"}
];





