import { eq, inArray } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import { schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";

/**
 * Negocio de demostración "Kyberon Studio" (FR-075): una agencia de
 * desarrollo de software y automatización para empresas.
 * Idempotente: borra los datos demo previos de la organización (scoped por
 * los teléfonos demo) y reinserta. El KB queda lleno EXCEPTO garantías y
 * devoluciones — hueco INTENCIONAL para que el Laboratorio encuentre algo
 * real en la primera corrida.
 *
 * Sin precios a propósito: la agencia entrega alcance y presupuesto por
 * escrito tras el diagnóstico, y el agente de la demo no da ninguno.
 */

type Db = ReturnType<typeof getDb>;

const HOURS = 60 * 60 * 1000;

const DEMO_CONTACTS: {
  /** Teléfono sintético: el prefijo 34 seguido de 0 no existe, así nadie real lo recibe. */
  phone: string;
  name: string;
  notes?: string;
  /** Etapas candidatas por nombre, de la más específica a la genérica. */
  stage: string[];
  thread: { dir: "in" | "out"; text: string; hoursAgo: number; ai?: boolean }[];
}[] = [
  {
    phone: "34000000001",
    name: "Marta Giménez",
    stage: ["Reunión agendada", "Interesado"],
    notes: "Clínica dental en Valencia; quiere que WhatsApp conteste solo y agende citas.",
    thread: [
      { dir: "in", text: "Hola, ¿hacéis sistemas para que el WhatsApp de mi clínica conteste solo?", hoursAgo: 5 },
      { dir: "out", text: "Hola, Marta. Sí: montamos atención al cliente automática en WhatsApp y web, que responde a cualquier hora y agenda la cita. ¿Qué programa usa hoy para las citas?", hoursAgo: 5, ai: true },
      { dir: "in", text: "Una agenda en el ordenador de recepción, nada conectado", hoursAgo: 4 },
      { dir: "out", text: "Entendido. Lo habitual es empezar con una reunión de diagnóstico de 30 minutos para ver cómo conectarlo. ¿Le propongo un hueco?", hoursAgo: 4, ai: true },
      { dir: "in", text: "Sí, me interesa. ¿Puede ser esta semana?", hoursAgo: 3 },
    ],
  },
  {
    phone: "34000000002",
    name: "Carlos Ramos",
    stage: ["Auditoría hecha", "En conversación"],
    thread: [
      { dir: "in", text: "Buenas, he hecho la auditoría gratis de mi web y me sale un 41 sobre 100", hoursAgo: 8 },
      { dir: "out", text: "Hola, Carlos. La auditoría analiza la velocidad, cómo la ve Google, el diseño y por dónde se escapan clientes. Si quiere el informe completo, se lo enviamos por correo.", hoursAgo: 8, ai: true },
      { dir: "in", text: "Sí, mándamelo. ¿Y arreglarlo cuánto cuesta?", hoursAgo: 7 },
      { dir: "out", text: "Depende de cada caso: tras un diagnóstico se entregan el alcance y el presupuesto por escrito. ¿Le agendo una reunión de 30 minutos?", hoursAgo: 7, ai: true },
    ],
  },
  {
    phone: "34000000003",
    name: "Lucía Herrero",
    stage: ["Cliente"],
    notes: "Gestoría en Zaragoza. Alta de clientes automática en marcha.",
    thread: [
      { dir: "in", text: "Hola de nuevo, el alta automática ya nos ahorra un montón de tiempo 🙌", hoursAgo: 30 },
      { dir: "out", text: "Nos alegra saberlo, Lucía. ¿Hay algo que quiera ajustar ahora que lleva unas semanas en uso?", hoursAgo: 30, ai: true },
      { dir: "in", text: "Sí, me gustaría que el correo de bienvenida saliera también en inglés", hoursAgo: 29 },
      { dir: "out", text: "Anotado. Paso la petición al equipo y le escriben en horario de atención.", hoursAgo: 29, ai: true },
    ],
  },
  {
    phone: "34000000004",
    name: "Javi Ortega",
    stage: ["Nuevo"],
    thread: [
      { dir: "in", text: "ola, aceis algo para q un bar no pierda clientes x internet?", hoursAgo: 2 },
      { dir: "out", text: "Hola, Javi. Sí, ayudamos a negocios que pierden clientes por su web. Si su bar ya tiene página, puede analizarla gratis en kyberonstudio.com: en un minuto le da una nota sobre 100.", hoursAgo: 2, ai: true },
    ],
  },
  {
    phone: "34000000005",
    name: "Ana Beltrán",
    stage: ["Propuesta enviada", "Interesado"],
    thread: [
      { dir: "in", text: "Hola, vi vuestro anuncio. ¿Trabajáis con inmobiliarias?", hoursAgo: 12 },
      { dir: "out", text: "Sí, Ana. Tenemos software y automatización pensados para inmobiliarias. ¿Qué le quita más tiempo ahora mismo?", hoursAgo: 12, ai: true },
      { dir: "in", text: "Pasar a mano los contactos al CRM y contestar siempre lo mismo", hoursAgo: 11 },
      { dir: "out", text: "Las dos cosas se pueden automatizar: la integración con su CRM y la atención automática. El alcance y el presupuesto se entregan por escrito tras el diagnóstico.", hoursAgo: 11, ai: true },
      { dir: "in", text: "Vale, lo comento con mi socio y os digo", hoursAgo: 10 },
    ],
  },
  {
    phone: "34000000006",
    name: "Roberto Medina",
    stage: ["Perdido"],
    notes: "Quería un precio cerrado por chat, sin diagnóstico. No encaja.",
    thread: [
      { dir: "in", text: "¿Cuánto me cobráis por una tienda online sencilla?", hoursAgo: 96 },
      { dir: "out", text: "Hola, Roberto. No damos precios por chat: depende de cada caso y se entrega por escrito tras un diagnóstico. ¿Le viene bien una reunión de 30 minutos?", hoursAgo: 96, ai: true },
      { dir: "in", text: "No, yo necesito un precio ya, en otro sitio me lo dan cerrado", hoursAgo: 95 },
      { dir: "out", text: "Lo entiendo. Si más adelante quiere compararlo con un presupuesto a medida, aquí estamos.", hoursAgo: 95, ai: true },
    ],
  },
  {
    phone: "34000000007",
    name: "Paula Domínguez",
    stage: ["Auditoría hecha", "En conversación"],
    thread: [
      { dir: "in", text: "Hola, pierdo muchísimo tiempo contestando correos de clientes 😩", hoursAgo: 26 },
      { dir: "out", text: "Hola, Paula. Tenemos un servicio de gestión automática del correo: lo ordena, deja las respuestas preparadas y le resume el día. ¿Cuántos correos recibe al día, más o menos?", hoursAgo: 26, ai: true },
      { dir: "in", text: "Unos 80, y la mitad preguntan lo mismo", hoursAgo: 25 },
    ],
  },
  {
    phone: "34000000008",
    name: "Jesús Aguilar",
    stage: ["Cliente"],
    notes: "Taller mecánico. Usa el software de gestión de talleres.",
    thread: [
      { dir: "in", text: "Buenas, el programa del taller va muy bien. ¿Se puede conectar con la facturación?", hoursAgo: 50 },
      { dir: "out", text: "Hola, Jesús. Sí, si su programa de facturación tiene API o integración, y la mayoría la tiene. ¿Cuál usa?", hoursAgo: 50, ai: true },
      { dir: "in", text: "Uno que nos puso la gestoría, luego le digo el nombre", hoursAgo: 49 },
      { dir: "out", text: "Perfecto. Cuando lo tenga, lo vemos con el equipo.", hoursAgo: 49, ai: true },
    ],
  },
];

const DEMO_KB: { kind: "qa" | "block"; question?: string; answer?: string; content?: string }[] = [
  {
    kind: "block",
    content:
      "SOBRE KYBERON STUDIO\nKyberon Studio es una agencia de desarrollo de software y automatización para pymes y empresas en España. Hace software a medida, sistemas que contestan a los clientes las 24 horas y conecta los programas de la empresa para que nadie copie datos a mano.\nWeb: https://www.kyberonstudio.com\nCorreo: hola@kyberonstudio.com\nHorario de atención de las personas del equipo: de lunes a viernes, de 10:00 a 14:00 y de 16:00 a 19:00, hora de Madrid.",
  },
  {
    kind: "block",
    content:
      "CÓMO TRABAJA KYBERON STUDIO\n1. Diagnóstico: se ve con el cliente dónde pierde tiempo o clientes.\n2. Diseño: qué automatizar y con qué. El alcance y el presupuesto se entregan por escrito.\n3. Desarrollo: se construye, se conecta a los programas del cliente y se prueba.\n4. Lanzamiento: se forma al equipo del cliente y se sigue ajustando con datos reales.\n5. Mantenimiento: Kyberon lo mantiene después del lanzamiento.\nUn proyecto estándar tarda entre tres y seis semanas desde la primera reunión.",
  },
  {
    kind: "block",
    content:
      "AUDITORÍA WEB GRATIS\nEl cliente escribe la dirección de su web en la página principal de kyberonstudio.com y en 30-60 segundos se analiza: velocidad, cómo la ve Google, diseño y por dónde se le escapan clientes. Recibe una nota sobre 100 y una estimación de lo que pierde al mes. Si quiere el informe completo, se le envía por correo.",
  },
  {
    kind: "block",
    content:
      "SERVICIO: Atención al cliente automática en WhatsApp y web\nUn sistema que responde a cada cliente en segundos, a cualquier hora, y le agenda la cita.",
  },
  {
    kind: "block",
    content:
      "SERVICIO: Integración de CRM y ERP con n8n\nEl CRM, el correo y la facturación de la empresa se pasan los datos solos. Kyberon trabaja con n8n, que conecta cientos de aplicaciones y se puede instalar en el servidor del cliente.",
  },
  {
    kind: "block",
    content:
      "SERVICIO: Alta de clientes automática\nEl contrato, la factura y el correo de bienvenida de cada cliente nuevo se generan y envían sin hacerlo a mano.",
  },
  {
    kind: "block",
    content:
      "SERVICIO: Auditoría operativa de procesos\nKyberon revisa qué tareas se repiten en la empresa y cuáles conviene automatizar primero.",
  },
  {
    kind: "block",
    content:
      "SERVICIO: Gestión automática del correo\nUn sistema que ordena el correo, deja las respuestas preparadas y resume el día.",
  },
  {
    kind: "block",
    content:
      "SERVICIO: Software instalado en los servidores del cliente\nKyberon instala el software en la infraestructura del cliente, de modo que sus datos no salen de casa.",
  },
  {
    kind: "block",
    content:
      "SECTORES CON SOLUCIONES ESPECÍFICAS\nKyberon tiene software y automatización pensados para inmobiliarias y para gestorías y asesorías. También trabaja con otros sectores.",
  },
  { kind: "qa", question: "¿Qué procesos de una pyme se pueden automatizar?", answer: "Casi cualquier tarea que se repite y sigue unas reglas: atender y cualificar clientes, agendar citas, pasar datos del CRM a la facturación, generar contratos y presupuestos, clasificar correos o enviar recordatorios." },
  { kind: "qa", question: "¿Cuánto se tarda en poner en marcha una automatización?", answer: "Un proyecto estándar tarda entre tres y seis semanas desde la primera reunión: un día de diagnóstico, de tres a cinco días de diseño, de dos a cuatro semanas de desarrollo y una semana de lanzamiento con pruebas." },
  { kind: "qa", question: "¿Se puede conectar con mi CRM, ERP o WhatsApp?", answer: "Sí, si la herramienta tiene API o integración, y la mayoría la tiene. Ya se han integrado WooCommerce, Bizum y Microsoft Teams." },
  { kind: "qa", question: "¿Cumple el RGPD? ¿Dónde se guardan los datos de mis clientes?", answer: "Se decide con el cliente dónde se guardan los datos, se limita a qué información accede cada sistema y se deja registrado cada tratamiento. Si la información es sensible, el software se instala en los servidores del cliente." },
  { kind: "qa", question: "¿Cuánto cuesta?", answer: "Depende de cada caso, por eso no se dan precios por chat. Tras el diagnóstico, Kyberon entrega el alcance y el presupuesto por escrito. La auditoría web es gratis." },
  // HUECO INTENCIONAL: nada sobre garantías ni devoluciones (lo encuentra el Laboratorio).
];

export async function seedDemo(
  db: Db,
  organizationId: string
): Promise<{ contacts: number; kbEntries: number }> {
  const demoPhones = DEMO_CONTACTS.map((c) => c.phone);

  // --- Idempotencia: limpiar datos demo previos (orden inverso de FKs) ---
  const prevContacts = await db
    .select({ id: schema.contact.id })
    .from(schema.contact)
    .where(inArray(schema.contact.phone, demoPhones));
  const prevIds = prevContacts.map((c) => c.id);
  if (prevIds.length > 0) {
    const prevConvs = await db
      .select({ id: schema.conversation.id })
      .from(schema.conversation)
      .where(inArray(schema.conversation.contactId, prevIds));
    const convIds = prevConvs.map((c) => c.id);
    if (convIds.length > 0) {
      await db
        .delete(schema.message)
        .where(inArray(schema.message.conversationId, convIds));
      await db
        .delete(schema.conversation)
        .where(inArray(schema.conversation.id, convIds));
    }
    await db.delete(schema.lead).where(inArray(schema.lead.contactId, prevIds));
    await db.delete(schema.contact).where(inArray(schema.contact.id, prevIds));
  }
  // KB y corridas demo previas
  await db
    .delete(schema.kbEntry)
    .where(eq(schema.kbEntry.organizationId, organizationId));
  await db
    .delete(schema.agentTestCase)
    .where(eq(schema.agentTestCase.organizationId, organizationId));
  await db
    .delete(schema.agentTestRun)
    .where(eq(schema.agentTestRun.organizationId, organizationId));

  // --- Etapas (por nombre) ---
  const stages = await db
    .select()
    .from(schema.pipelineStage)
    .where(eq(schema.pipelineStage.organizationId, organizationId));
  const stageByName = new Map(stages.map((s) => [s.name, s.id]));
  const fallbackStage = stages[0]?.id;
  if (!fallbackStage) throw new Error("La organización no tiene etapas");

  // --- Contactos + conversaciones + mensajes + leads ---
  const now = Date.now();
  let position = 0;
  for (const demo of DEMO_CONTACTS) {
    const contactId = newId("contact");
    await db.insert(schema.contact).values({
      id: contactId,
      organizationId,
      phone: demo.phone,
      waIdentity: demo.phone,
      name: demo.name,
      notes: demo.notes ?? null,
    });

    const lastInbound = demo.thread
      .filter((t) => t.dir === "in")
      .reduce((min, t) => Math.min(min, t.hoursAgo), Infinity);
    const lastMessage = demo.thread.reduce(
      (min, t) => Math.min(min, t.hoursAgo),
      Infinity
    );

    const conversationId = newId("conversation");
    await db.insert(schema.conversation).values({
      id: conversationId,
      organizationId,
      contactId,
      lastInboundAt: new Date(now - lastInbound * HOURS),
      lastMessageAt: new Date(now - lastMessage * HOURS),
      unreadCount: demo.thread[demo.thread.length - 1]?.dir === "in" ? 1 : 0,
    });

    for (const msg of demo.thread) {
      const at = new Date(now - msg.hoursAgo * HOURS);
      await db.insert(schema.message).values({
        id: newId("message"),
        organizationId,
        conversationId,
        waMessageId: `wamid.demo.${newId("message")}`,
        direction: msg.dir,
        type: "text",
        text: msg.text,
        status: msg.dir === "in" ? "delivered" : "read",
        aiGenerated: msg.ai ?? false,
        origin: msg.ai ? "ai" : "operator",
        waTimestamp: at,
        createdAt: at,
      });
    }

    await db.insert(schema.lead).values({
      id: newId("lead"),
      organizationId,
      contactId,
      stageId:
        demo.stage
          .map((name) => stageByName.get(name))
          .find((id) => id !== undefined) ?? fallbackStage,
      position: position++,
      lastActivityAt: new Date(now - lastMessage * HOURS),
    });
  }

  // --- Knowledge base (con el hueco intencional) ---
  for (const entry of DEMO_KB) {
    await db.insert(schema.kbEntry).values({
      id: newId("kbEntry"),
      organizationId,
      kind: entry.kind,
      question: entry.question ?? null,
      answer: entry.answer ?? null,
      content: entry.content ?? null,
    });
  }

  // --- Comportamiento del agente de la demo ---
  await db
    .update(schema.agentProfile)
    .set({
      name: "Oliver",
      tone: "Profesional, claro y directo. Trata de usted. Frases cortas, sin tecnicismos innecesarios.",
      instructions:
        "Entiende el problema del cliente con pocas preguntas y explica cómo puede ayudar Kyberon usando solo los servicios del conocimiento. Propón la auditoría web gratis o una reunión de diagnóstico de 30 minutos. No des precios: el presupuesto se entrega por escrito tras el diagnóstico. Nunca inventes servicios, plazos ni resultados.",
      escalationRules:
        "Escala a un humano si piden presupuesto o precio, si hay una incidencia o reclamación de un cliente actual, si preguntan algo que no está en el conocimiento o si lo piden explícitamente.",
      greeting: "Hola, soy Oliver, el asistente de Kyberon Studio. ¿En qué puedo ayudarle?",
      updatedAt: new Date(),
    })
    .where(eq(schema.agentProfile.organizationId, organizationId));

  // --- Corrida de Laboratorio de ejemplo (guardada, con el hueco encontrado) ---
  const runId = newId("testRun");
  await db.insert(schema.agentTestRun).values({
    id: runId,
    organizationId,
    status: "done",
    score: 83,
    startedAt: new Date(now - 24 * HOURS),
    finishedAt: new Date(now - 24 * HOURS + 3 * 60 * 1000),
  });
  const exampleCases: {
    persona: string;
    veredicto: "verde" | "amarillo" | "rojo";
    hallazgos: unknown[];
    transcript: { role: string; text: string }[];
  }[] = [
    {
      persona: "comprador_decidido",
      veredicto: "verde",
      hallazgos: [],
      transcript: [
        { role: "cliente", text: "Tengo una tienda online y quiero que los WhatsApp de mis clientes se contesten solos. ¿Lo hacéis?" },
        { role: "agente", text: "Sí: montamos atención al cliente automática en WhatsApp y web, que responde a cualquier hora y agenda la cita." },
        { role: "cliente", text: "Me convence, quiero empezar. ¿Cuál es el siguiente paso?" },
        { role: "agente", text: "Una reunión de diagnóstico de 30 minutos por videollamada. ¿Le propongo un hueco?" },
      ],
    },
    {
      persona: "pregunton_precios",
      veredicto: "verde",
      hallazgos: [],
      transcript: [
        { role: "cliente", text: "Hola, ¿cuánto cuesta una web?" },
        { role: "agente", text: "Depende de cada caso, por eso no damos precios por chat. Tras el diagnóstico se entregan el alcance y el presupuesto por escrito." },
      ],
    },
    {
      persona: "cliente_enojado",
      veredicto: "amarillo",
      hallazgos: [
        {
          tipo: "tono",
          evidencia:
            "El agente respondió correcto pero algo frío ante 'estoy perdiendo clientes'; faltó empatizar antes de escalar.",
        },
      ],
      transcript: [
        { role: "cliente", text: "Os contraté una automatización hace un mes y lleva dos días sin funcionar, estoy perdiendo clientes" },
        { role: "agente", text: "Lamento el problema. Paso su caso a una persona del equipo para resolverlo." },
      ],
    },
    {
      persona: "fuera_de_kb",
      veredicto: "rojo",
      hallazgos: [
        {
          tipo: "fuera_de_kb",
          evidencia:
            "El cliente preguntó por la garantía del software entregado y el conocimiento no lo cubre.",
          sugerencia: {
            pregunta: "¿Qué garantía tiene el software que entregáis?",
            respuesta:
              "PENDIENTE: escribe aquí la garantía real que ofreces antes de aplicar esta sugerencia.",
          },
        },
      ],
      transcript: [
        { role: "cliente", text: "¿Qué garantía dais sobre el software que entregáis?" },
        { role: "agente", text: "No tengo ese dato. Lo consulto con el equipo y le responden en horario de atención." },
      ],
    },
    {
      persona: "pide_humano",
      veredicto: "verde",
      hallazgos: [],
      transcript: [
        { role: "cliente", text: "Prefiero que me atienda una persona, quiero hablar con un humano" },
        { role: "agente", text: "(handoff: la conversación pasó a atención humana)" },
      ],
    },
    {
      persona: "errores_modismos",
      veredicto: "verde",
      hallazgos: [],
      transcript: [
        { role: "cliente", text: "ola buenas, aceis paginas web?" },
        { role: "agente", text: "Hola. Ayudamos a negocios que pierden clientes por su web. ¿Tiene ya página? Puede analizarla gratis en kyberonstudio.com." },
      ],
    },
  ];
  for (const c of exampleCases) {
    await db.insert(schema.agentTestCase).values({
      id: newId("testCase"),
      organizationId,
      runId,
      persona: c.persona,
      status: "done",
      veredicto: c.veredicto,
      hallazgos: c.hallazgos,
      transcript: c.transcript,
    });
  }

  return { contacts: DEMO_CONTACTS.length, kbEntries: DEMO_KB.length };
}

/** true si la organización aún no tiene datos de dominio (para el botón). */
export async function isDomainEmpty(
  db: Db,
  organizationId: string
): Promise<boolean> {
  const rows = await db
    .select({ id: schema.contact.id })
    .from(schema.contact)
    .where(eq(schema.contact.organizationId, organizationId))
    .limit(1);
  return rows.length === 0;
}
