// Use the Apps Script URL from env
const GAS_URL = process.env.GOOGLE_SHEETS_API_URL;

export type SheetRow = {
  id: string;
  datetime: string;
  category: string;
  content: string;
  color: string;
};

export async function fetchMemosFromSheet(): Promise<SheetRow[]> {
  if (!GAS_URL) {
    console.warn("GOOGLE_SHEETS_API_URL not set.");
    return [];
  }

  try {
    console.log("Fetching from GAS URL:", GAS_URL);
    const response = await fetch(GAS_URL, { redirect: "follow" });
    if (!response.ok) throw new Error("Failed to fetch from GAS");
    
    const data = await response.json();
    
    // GAS에서 반환된 객체 배열을 SheetRow 형식으로 안전하게 변환
    if (Array.isArray(data.memos)) {
      return data.memos.map((m: any) => ({
        id: String(m.id || ""),
        datetime: String(m.datetime || ""),
        category: String(m.category || ""),
        content: String(m.content || ""),
        color: String(m.color || "")
      })).filter((m: any) => m.id); // ID가 있는 유효한 데이터만 반환
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching from GAS:", error);
    return [];
  }
}

export async function addMemoToSheet(memo: SheetRow) {
  if (!GAS_URL) return;

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "CREATE",
        payload: memo,
      }),
    });
    console.log("Add memo response status:", response.status);
  } catch (error) {
    console.error("Error creating via GAS:", error);
  }
}

export async function updateMemoInSheet(memo: SheetRow) {
  if (!GAS_URL) return;

  try {
    await fetch(GAS_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "UPDATE",
        payload: memo,
      }),
    });
  } catch (error) {
    console.error("Error updating via GAS:", error);
  }
}

export async function deleteMemoFromSheet(id: string) {
  if (!GAS_URL) return;

  try {
    console.log("Deleting memo with ID via GAS:", id);
    const response = await fetch(GAS_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "DELETE",
        payload: { id: String(id) },
      }),
    });
    
    const result = await response.json();
    console.log("Delete response result:", result);
  } catch (error) {
    console.error("Error deleting via GAS:", error);
  }
}
