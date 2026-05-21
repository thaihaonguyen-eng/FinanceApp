import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const generateAIResponse = async (userMessage, contextData) => {
  try {
    const apiKey = await AsyncStorage.getItem('gemini_api_key');
    if (!apiKey || apiKey.trim() === "") {
      return "Tôi chưa thể trả lời vì bạn chưa cung cấp **Mã API Key (Gemini)**.\n\nVui lòng vào mục Cài đặt (Settings) -> Dán API Key vào để kích hoạt tự vấn.";
    }

    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Bạn là một chuyên gia tư vấn tài chính cá nhân thân thiện, được nhúng trong ứng dụng Quản lý Chi tiêu bản React Native.
Bạn có quyền xem thông tin (JSON) về 10 giao dịch gần nhất của người dùng dưới đây:
${JSON.stringify(contextData)}

Người dùng hỏi: ${userMessage}

Hãy trả lời thật ngắn gọn, tự nhiên, mang tính chuyên môn nhưng dễ hiểu tiếng Việt, dưới 100 chữ. Hãy cố gắng áp dụng thông tin từ giao dịch gần nhất để cho thấy bạn rất hiểu họ. Nếu không có giao dịch, hãy trả lời chung chung tài chính. Đừng bao giờ trả lời bằng mã code hoặc câu trả lời máy móc.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Lỗi AI Chi tiết:", error);
    let errorMsg = error.message || "";
    if (errorMsg.includes("API_KEY_INVALID")) return "Lỗi: **Mã API Key không hợp lệ**. Bạn hãy kiểm tra và dán lại mã chính xác nhé.";
    if (errorMsg.includes("location is not supported")) return "Lỗi: **Khu vực của bạn chưa được Google Gemini hỗ trợ**. Bạn có thể thử dùng công cụ VPN để đổi vùng sang Singapore hoặc Mỹ.";
    
    return `Lỗi kết nối AI: ${errorMsg.substring(0, 100)}... Hãy kiểm tra lại API Key hoặc mạng internet.`;
  }
};
