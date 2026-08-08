import Foundation

/// 2026-08-08에 `gpt-5.3-codex-spark`로 실제 생성한 Read an Academic Passage 응답.
///
/// 스키마가 바뀌면 앱이 조용히 빈 화면을 띄우게 되므로, 실제 출력 하나를 박아 두고
/// 정규화가 끝까지 통과하는지 확인한다.
enum RealReadingResponseFixture {
    static let academicPassageJSON = """
{
  "taskType": "academic-passage",
  "title": "Building Heat-Resilient Cities",
  "stimulusLabel": "Academic passage",
  "stimulus": "Across many cities from Manila to Madrid, the urban heat island effect has become a ubiquitous feature: daytime temperatures in districts with dense asphalt stay higher than nearby rural areas. At first, cities focused on adding shade trees alone, but climate researchers found that this strategy works best only when paired with materials that reflect sunlight and hold moisture. Rooftop and pavement materials made from standard dark asphalt absorb and slowly release heat, while lighter permeable surfaces reflect part of the solar energy and allow evaporation. As a result, reflective coatings and green roofs are often presented as short-term fixes, whereas city planners also use zoning for wind corridors and tree-lined streets to strengthen long-term adaptation and community resilience during heat waves. In 2019, the city of Seongnam redesigned 12% of its bus stops with light-colored canopies and planted vines on nearby façades. Within three summers, electricity use for cooling in nearby offices declined by 18%, and heat-related visits to local clinics dropped. However, officials cautioned that these gains were stronger in districts with regular maintenance, because dirty surfaces quickly lose reflectivity. The pilot showed that heat-management policies require technical design and continued upkeep if they are to remain effective.",
  "topicTags": [
    "urban-planning",
    "climate-science",
    "public-policy"
  ],
  "questions": [
    {
      "id": 1,
      "prompt": "The word/phrase \\"ubiquitous\\" in the passage is closest in meaning to which option?",
      "options": [
        "Temporary and short-lived",
        "Rare and unusual",
        "Found in many places or commonly occurring",
        "Causing environmental damage"
      ],
      "answerIndex": 2,
      "skillTag": "vocabulary-context",
      "explanationKo": "문맥에서 \\"ubiquitous\\"는 여러 도시에서 열섬 현상이 매우 널리 나타난다는 의미로 쓰였으며, 이는 \\"많이, 여기저기 존재하는\\" 뜻의 선택지 C가 가장 적절합니다.",
      "saveableWords": [
        "ubiquitous"
      ]
    },
    {
      "id": 2,
      "prompt": "Which of the following is NOT mentioned in the passage as a city approach to reducing heat-related problems?",
      "options": [
        "Building underground parking lots under major roads",
        "Applying reflective coatings to roofs and pavements",
        "Pairing shade-providing trees with reflective or moisture-retaining materials",
        "Maintaining redesigned surfaces so they do not lose reflectivity"
      ],
      "answerIndex": 0,
      "skillTag": "detail",
      "explanationKo": "지문에서는 반사 코팅, 나무·녹지 조합, 표면의 정기적 관리가 모두 언급됩니다. 지하 도로 주차장 건설은 제시되지 않았기 때문에 0번이 정답입니다.",
      "saveableWords": []
    },
    {
      "id": 3,
      "prompt": "Which inference is best supported by the passage?",
      "options": [
        "Cities should avoid reflective materials because they are only useful in rainy seasons.",
        "Even effective heat-reduction designs lose much of their impact without regular maintenance.",
        "Heat waves will disappear automatically once reflective materials are installed.",
        "Bus-stop redesign is the only measure needed for long-term resilience."
      ],
      "answerIndex": 1,
      "skillTag": "inference",
      "explanationKo": "사례에서 유지보수가 잘 된 지역에서 효과가 더 컸고, 더러운 표면은 반사력이 떨어진다고 했으므로, 유지보수가 지속되어야 효과가 유지된다는 추론이 가능합니다.",
      "saveableWords": []
    },
    {
      "id": 4,
      "prompt": "Why does the author mention the Seongnam pilot project?",
      "options": [
        "To show that short-term measures are useless in practice.",
        "To argue that only rural areas benefit from heat-management policies.",
        "To suggest that climate data are not needed when planning urban policy.",
        "To provide concrete evidence of measurable benefits while also showing the limit that maintenance affects outcomes."
      ],
      "answerIndex": 3,
      "skillTag": "rhetorical-purpose",
      "explanationKo": "저자들은 일반적 논의(재료·설계의 중요성) 뒤에 서울남 사례를 넣어 수치로 효과를 보여주고, 동시에 유지보수 조건에 따라 효과가 달라짐을 보여주기 위해 제시했습니다.",
      "saveableWords": [
        "resilience"
      ]
    },
    {
      "id": 5,
      "prompt": "Which statement best describes the relationship between the two paragraphs?",
      "options": [
        "The second paragraph introduces a completely unrelated public-transportation topic.",
        "The second paragraph gives a specific example that supports and qualifies the general claims of the first.",
        "The second paragraph rejects the first paragraph’s argument about combining short-term and long-term strategies.",
        "The second paragraph says only maintenance matters and planning ideas are irrelevant."
      ],
      "answerIndex": 1,
      "skillTag": "idea-relationship",
      "explanationKo": "첫 단락은 열섬 완화의 일반 원리를 설명하고, 둘째 단락은 그 원리를 실제 도시 사례로 뒷받침한 뒤 유지관리 조건을 덧붙여 관계를 정교화합니다. 따라서 2번이 정답입니다.",
      "saveableWords": [
        "resilience"
      ]
    }
  ]
}
"""
}
