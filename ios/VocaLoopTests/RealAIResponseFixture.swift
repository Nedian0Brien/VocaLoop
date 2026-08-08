import Foundation
import Testing

@testable import VocaLoop

/// 실제 `/api/ai/codex` 응답을 그대로 담은 픽스처.
/// 2026-08-08에 로컬 백엔드로 gpt-5.3-codex-spark를 호출해 받은 출력이다.
enum RealAIResponse {
    static let completeWords = #"""
{
  "questions": [
    {
      "paragraph": "Coastal Bangladesh has become a central case in climate adaptation research because sea-level rise and storm intensity are increasing together. After the catastrophic {{1}} of 1991 and 2007, household relocation policies shifted from temporary shelters {{2}} rebuilding in safer zones. Yet this change proceeded slowly because aid agencies prioritized {{3}} relief while municipalities delayed zoning reform. In many districts, these initiatives were undercut by {{4}} coordination {{5}} local councils, and they did not prevent vulnerable residents from rebuilding where flood channels remained open. Researchers therefore recommend community-based mapping with annual audits so that adaptation plans match projected rainfall and sediment movement.",
      "fullParagraph": "Coastal Bangladesh has become a central case in climate adaptation research because sea-level rise and storm intensity are increasing together. After the catastrophic cyclones of 1991 and 2007, household relocation policies shifted from temporary shelters to rebuilding in safer zones. Yet this change proceeded slowly because aid agencies prioritized emergency relief while municipalities delayed zoning reform. In many districts, these initiatives were undercut by poor coordination with local councils, and they did not prevent vulnerable residents from rebuilding where flood channels remained open. Researchers therefore recommend community-based mapping with annual audits so that adaptation plans match projected rainfall and sediment movement.",
      "blanks": [
        { "id": 1, "answer": "cyclones", "revealCount": 3 },
        { "id": 2, "answer": "to", "revealCount": 1 },
        { "id": 3, "answer": "emergency", "revealCount": 3 },
        { "id": 4, "answer": "poor", "revealCount": 2 },
        { "id": 5, "answer": "with", "revealCount": 2 }
      ]
    },
    {
      "paragraph": "In Canada, bilingual education debates moved since the 1980s from symbolic recognition to measurable outcomes. Studies on Indigenous communities show that minority-language immersion can produce {{1}} gains in reading comprehension. Yet officials caution that the gains are not uniform, because support levels vary {{2}} school infrastructure {{3}} teacher training. In Grades 4 through 10, students who practice metacognitive reflection retain material longer than peers who rely {{4}} direct translation, and the effect appears to depend {{5}} on teacher feedback. The broader evidence suggests that transfer succeeds when policy is adapted to staffing stability and local collaboration.",
      "fullParagraph": "In Canada, bilingual education debates moved since the 1980s from symbolic recognition to measurable outcomes. Studies on Indigenous communities show that minority-language immersion can produce substantial gains in reading comprehension. Yet officials caution that the gains are not uniform, because support levels vary by school infrastructure and teacher training. In Grades 4 through 10, students who practice metacognitive reflection retain material longer than peers who rely on direct translation, and the effect appears to depend heavily on teacher feedback. The broader evidence suggests that transfer succeeds when policy is adapted to staffing stability and local collaboration.",
      "blanks": [
        { "id": 1, "answer": "substantial", "revealCount": 3 },
        { "id": 2, "answer": "by", "revealCount": 1 },
        { "id": 3, "answer": "and", "revealCount": 1 },
        { "id": 4, "answer": "on", "revealCount": 1 },
        { "id": 5, "answer": "heavily", "revealCount": 3 }
      ]
    },
    {
      "paragraph": "Historical climatology and economic history are increasingly connected through studies of premodern maritime networks in the Indian Ocean. In the 14th century, historians comparing Arab and Venetian records documented {{1}} swings in monsoon timing that altered sailing windows across the Arabian Sea. When winds shifted, rulers did not merely wait for better weather; they created staged markets in oasis cities, {{2}} to shorten voyages and {{3}} stabilize grain prices. This adaptation shows that commerce survived through legal contracts {{4}} water management, because innovation could not prevent shortages {{5}} repeated crop failures. These records suggest that governance, not ships, determined resilience during drought.",
      "fullParagraph": "Historical climatology and economic history are increasingly connected through studies of premodern maritime networks in the Indian Ocean. In the 14th century, historians comparing Arab and Venetian records documented seasonal swings in monsoon timing that altered sailing windows across the Arabian Sea. When winds shifted, rulers did not merely wait for better weather; they created staged markets in oasis cities, intended to shorten voyages and to stabilize grain prices. This adaptation shows that commerce survived through legal contracts with water management, because innovation could not prevent shortages in repeated crop failures. These records suggest that governance, not ships, determined resilience during drought.",
      "blanks": [
        { "id": 1, "answer": "seasonal", "revealCount": 3 },
        { "id": 2, "answer": "intended", "revealCount": 3 },
        { "id": 3, "answer": "to", "revealCount": 1 },
        { "id": 4, "answer": "with", "revealCount": 2 },
        { "id": 5, "answer": "in", "revealCount": 1 }
      ]
    }
  ]
}
"""#
}
