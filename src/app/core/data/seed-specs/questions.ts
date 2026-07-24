import { QuestionType, Difficulty, QuestionStatus } from '@core/models/enums';

export interface QuestionSpec {
  questionText: string;
  type: QuestionType;
  options: string[];
  correctAnswer: number | string;
  difficulty: Difficulty;
  points: number;
  outcomeIds: number[];
  examId: number;
}

const MC = QuestionType.MULTIPLE_CHOICE, TF = QuestionType.TRUE_FALSE, SA = QuestionType.SHORT_ANSWER, ES = QuestionType.ESSAY;
const E = Difficulty.EASY, M = Difficulty.MEDIUM, H = Difficulty.HARD;

export const QUESTION_SPECS: QuestionSpec[] = [
  // Sınav 1: Angular Temelleri Final
  { questionText: 'Angular hangi dil ile yazılmıştır?', type: MC, options: ['Python', 'TypeScript', 'Java', 'C#'], correctAnswer: 1, difficulty: E, points: 5, outcomeIds: [100], examId: 1 },
  { questionText: "Angular'da component oluşturmak için hangi CLI komutu kullanılır?", type: MC, options: ['ng new component', 'ng generate component', 'ng create component', 'ng add component'], correctAnswer: 1, difficulty: E, points: 5, outcomeIds: [100], examId: 1 },
  { questionText: "Angular'da two-way binding hangi direktif ile yapılır?", type: MC, options: ['ngModel', 'ngBind', 'ngTwoWay', 'ngCopy'], correctAnswer: 0, difficulty: M, points: 10, outcomeIds: [101], examId: 1 },
  { questionText: "RxJS'te Observable oluşturmak için hangi yöntem kullanılır?", type: MC, options: ['create() fonksiyonu', 'of() fonksiyonu', 'new Observable()', 'Hepsi'], correctAnswer: 2, difficulty: H, points: 15, outcomeIds: [102], examId: 1 },
  { questionText: "Angular'da Pipe nedir, kısaca açıklayınız.", type: SA, options: [], correctAnswer: 'dönüştürme,biçimlendirme,veri', difficulty: E, points: 5, outcomeIds: [101], examId: 1 },
  { questionText: "Angular'da Dependency Injection mekanizmasını ayrıntılı açıklayınız.", type: ES, options: [], correctAnswer: 0, difficulty: M, points: 10, outcomeIds: [102], examId: 1 },
  { questionText: 'Angular standalone component mimarisi önerilir mi?', type: TF, options: ['Doğru', 'Yanlış'], correctAnswer: 0, difficulty: M, points: 5, outcomeIds: [103], examId: 1 },

  // Sınav 2: RxJS Ara Sınav
  { questionText: "RxJS'te Subject nedir?", type: MC, options: ['Observable ve Observer', 'Promise türü', 'Event emitter', 'Veri deposu'], correctAnswer: 0, difficulty: M, points: 10, outcomeIds: [106], examId: 2 },
  { questionText: "RxJS'te hangi operatör veriyi dönüştürür?", type: MC, options: ['map', 'filter', 'reduce', 'take'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [106], examId: 2 },

  // Sınav 3: TypeScript Final
  { questionText: "TypeScript'te tip tanımlamak için hangi anahtar kelime kullanılır?", type: MC, options: ['type', 'interface', 'class', 'typedef'], correctAnswer: 1, difficulty: E, points: 5, outcomeIds: [109], examId: 3 },
  { questionText: 'Generic fonksiyon nasıl tanımlanır?', type: MC, options: ['func<T>()', 'function<T>()', '<T> function()', 'generic function()'], correctAnswer: 1, difficulty: M, points: 10, outcomeIds: [109], examId: 3 },
  { questionText: "TypeScript'te Union Type nasıl tanımlanır?", type: MC, options: ['string', 'string | number', 'string & number', 'string[]'], correctAnswer: 1, difficulty: M, points: 10, outcomeIds: [109], examId: 3 },
  { questionText: 'TypeScript Enum kullanımı hangi durumda tercih edilir?', type: MC, options: ['Sabit değerler için', 'Dinamik değerler için', 'Fonksiyonlar için', 'Sınıflar için'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [109], examId: 3 },

  // Sınav 4: Tailwind CSS Ara Sınav
  { questionText: "Tailwind CSS'te flexbox için hangi class kullanılır?", type: MC, options: ['flex', 'grid', 'block', 'inline'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [114], examId: 4 },
  { questionText: "Tailwind CSS'te renk belirtmek için hangi class kullanılır?", type: MC, options: ['text-blue-500', 'color-blue', 'font-blue', 'bg-blue'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [114], examId: 4 },

  // Sınav 5: Node.js Final
  { questionText: 'Node.js hangi JavaScript motorunu kullanır?', type: MC, options: ['V8', 'SpiderMonkey', 'JavaScriptCore', 'Chakra'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [111], examId: 5 },
  { questionText: "Express.js'te route parametresi nasıl tanımlanır?", type: MC, options: ['/users/:id', '/users/{id}', '/users/<id>', '/users#[id]'], correctAnswer: 0, difficulty: M, points: 10, outcomeIds: [112], examId: 5 },
  { questionText: 'Node.js modül dışa aktarmak için hangi anahtar kelime kullanılır?', type: MC, options: ['module.exports', 'import', 'require', 'export'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [111], examId: 5 },
  { questionText: "Express.js'te middleware nedir?", type: MC, options: ['İstek-cevap döngüsünde çalışan fonksiyon', 'Veritabanı bağlantısı', 'Route tanımı', 'Hata yönetimi'], correctAnswer: 0, difficulty: M, points: 10, outcomeIds: [112], examId: 5 },

  // Sınav 6: React vs Angular Değerlendirme
  { questionText: "Angular'da state yönetimi için hangi kütüphane kullanılır?", type: MC, options: ['NgRx', 'Redux', 'MobX', 'Vuex'], correctAnswer: 0, difficulty: M, points: 10, outcomeIds: [113], examId: 6 },
  { questionText: "React'te component state'i hangi hook ile yönetilir?", type: MC, options: ['useState', 'useEffect', 'useReducer', 'useMemo'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [113], examId: 6 },
  { questionText: "React'te JSX nedir?", type: MC, options: ['JS içinde HTML benzeri sözdizimi', 'JavaScript kütüphanesi', 'State yönetim aracı', 'Build aracı'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [113], examId: 6 },
  { questionText: "Angular'da Signal nedir?", type: MC, options: ['Reaktif state yönetimi', 'HTTP isteği', 'Pipe türü', 'Guard türü'], correctAnswer: 0, difficulty: M, points: 10, outcomeIds: [113], examId: 6 },

  // Sınav 7: Angular Temelleri Ara Sınav
  { questionText: "Angular'da @Input dekoratörü ne işe yarar?", type: MC, options: ["Parent'tan child'a veri aktarır", "Child'tan parent'a veri aktarır", 'Servis enjekte eder', 'Pipe tanımlar'], correctAnswer: 0, difficulty: E, points: 5, outcomeIds: [103], examId: 7 },
  { questionText: 'Angular Routing wildcard route nasıl tanımlanır?', type: MC, options: ['**', '*', '/*', '?'], correctAnswer: 0, difficulty: M, points: 10, outcomeIds: [103], examId: 7 },
];
