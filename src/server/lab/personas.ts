/**
 * Las 6 personas GUIONADAS del Laboratorio (FR-030). El cliente simulado no
 * usa LLM: son secuencias fijas — determinismo total del lado del cliente.
 * El agente que responde es el REAL (mismo pipeline de US3).
 */

export type Persona = {
  key: string;
  label: string;
  description: string;
  /** Teléfono sintético estable (jamás un número real). */
  phone: string;
  contactName: string;
  script: string[];
};

export const PERSONAS: Persona[] = [
  {
    key: "comprador_decidido",
    label: "Comprador decidido",
    description: "Sabe lo que quiere y va directo a contratar.",
    phone: "5210000000001",
    contactName: "[Prueba] Comprador decidido",
    script: [
      "Hola, buenas tardes",
      "Tengo una tienda online y quiero que los WhatsApp de mis clientes se contesten solos. ¿Lo hacéis?",
      "Perfecto. ¿Y cuánto se tarda en tenerlo funcionando?",
      "Me convence, quiero empezar. ¿Cuál es el siguiente paso?",
    ],
  },
  {
    key: "pregunton_precios",
    label: "Preguntón de precios",
    description: "Pregunta precio tras precio sin decidirse.",
    phone: "5210000000002",
    contactName: "[Prueba] Preguntón de precios",
    script: [
      "Hola, ¿cuánto cuesta una web?",
      "¿Y un chatbot para WhatsApp?",
      "¿Cuánto me costaría conectar mi CRM con la facturación?",
      "¿Hacéis descuento si contrato varias cosas?",
      "Vale, lo voy a pensar",
    ],
  },
  {
    key: "cliente_enojado",
    label: "Cliente enojado",
    description: "Llega molesto por un problema con un proyecto ya contratado.",
    phone: "5210000000003",
    contactName: "[Prueba] Cliente enojado",
    script: [
      "Esto no puede ser",
      "Os contraté una automatización hace un mes y lleva dos días sin funcionar, estoy perdiendo clientes",
      "¿Me va a contestar alguien o no? Quiero una solución YA",
      "Eso espero, porque no pienso pagar por algo que no funciona",
    ],
  },
  {
    key: "fuera_de_kb",
    label: "Pregunta fuera del conocimiento",
    description: "Pregunta algo que el knowledge base no cubre (fuera_de_kb).",
    phone: "5210000000004",
    contactName: "[Prueba] Fuera del conocimiento",
    script: [
      "Hola, una pregunta",
      "¿Qué garantía dais sobre el software que entregáis?",
      "¿Y si falla a los dos meses lo arregláis gratis?",
      "¿Dónde reclamo la garantía si hay un problema?",
    ],
  },
  {
    key: "pide_humano",
    label: "Pide un humano",
    description: "Quiere ser atendido por una persona (debe escalar).",
    phone: "5210000000005",
    contactName: "[Prueba] Pide humano",
    script: [
      "Hola",
      "Tengo un asunto delicado con un proyecto",
      "Prefiero que me atienda una persona, quiero hablar con un humano",
      "Gracias",
    ],
  },
  {
    key: "errores_modismos",
    label: "Errores y modismos",
    description: "Escribe con faltas de ortografía y abreviaturas de móvil.",
    phone: "5210000000006",
    contactName: "[Prueba] Errores y modismos",
    script: [
      "ola buenas, aceis paginas web?",
      "esq tengo un bar y no m entra gente x internet",
      "y eso d la auditoria gratis q es, cuanto tarda",
      "vale pues luego lo miro, gracias",
    ],
  },
];

export const PERSONA_LABELS: Record<string, string> = Object.fromEntries(
  PERSONAS.map((p) => [p.key, p.label])
);
