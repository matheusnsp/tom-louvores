// ============================================================
//  CONFIGURAÇÃO DO SUPABASE — Tom Louvores
//  A chave anon/publishable é segura para ficar no frontend.
//  NUNCA coloque a secret key aqui.
// ============================================================

const CONFIG = {
    SUPABASE_URL: "https://rosvseljurczmzdycbxs.supabase.co",
    SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvc3ZzZWxqdXJjem16ZHljYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODI0MTUsImV4cCI6MjA5NjQ1ODQxNX0.XbiVRQLFzWj7j7-KRXxdtT_3giO0TOsE5hRw86NYNVQ",
    TABLE_NAME: "musicas",
    // Escala mensal (ministrante) — projeto Firebase escala-lideres
    FIREBASE: {
      apiKey: "AIzaSyAbgPu2ilzgNu69b2uOjiM9SmYoqy_Kj8o",
      authDomain: "escala-lideres.firebaseapp.com",
      projectId: "escala-lideres",
      storageBucket: "escala-lideres.firebasestorage.app",
      messagingSenderId: "622766190731",
      appId: "1:622766190731:web:548848b2e775180376648e",
    },
  };

  const CULTOS_FIX = [
    { tipo: "quarta",        titulo: "Quarta",  dia: "Quarta-feira",    diaSemana: 3, h: 19, min: 30 },
    { tipo: "domingo_manha", titulo: "Domingo", dia: "Domingo · Manhã", diaSemana: 0, h: 10, min: 0  },
    { tipo: "domingo_noite", titulo: "Domingo", dia: "Domingo · Noite", diaSemana: 0, h: 19, min: 0  },
   
    // Culto novo e recorrente? É só acrescentar uma linha aqui.
    // { tipo: "sabado_jovens", titulo: "Jovens", dia: "Sábado · Jovens", diaSemana: 6, h: 19, min: 30 },
  ];