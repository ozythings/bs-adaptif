import { QuestionType, Difficulty, QuestionStatus } from '@core/models/enums';

export interface QuestionSpec {
  questionText: string;
  type: QuestionType;
  options: string[];
  correctAnswer: number | string;
  solution: string;
  difficulty: Difficulty;
  points: number;
  tags?: string[];
  outcomeIds: number[];
  examId: number;
}

const MC = QuestionType.MULTIPLE_CHOICE, TF = QuestionType.TRUE_FALSE, SA = QuestionType.SHORT_ANSWER, ES = QuestionType.ESSAY;
const E = Difficulty.EASY, M = Difficulty.MEDIUM, H = Difficulty.HARD;

export const QUESTION_SPECS: QuestionSpec[] = [
  // Sınav 1: Angular Temelleri Final
  { questionText: 'Angular hangi dil ile yazılmıştır?', type: MC, options: ['Python', 'TypeScript', 'Java', 'C#'], correctAnswer: 1, solution: 'Angular, Google tarafından geliştirilen ve TypeScript ile yazılan bir frontend framework\'tür. TypeScript, JavaScript\'in tipli bir üst kümesidir.', difficulty: E, points: 5, tags: ['angular', 'typescript'], outcomeIds: [100], examId: 1 },
  { questionText: "Angular'da component oluşturmak için hangi CLI komutu kullanılır?", type: MC, options: ['ng new component', 'ng generate component', 'ng create component', 'ng add component'], correctAnswer: 1, solution: "'ng generate component <isim>' komutu yeni bir Angular component\'i oluşturur. Kısaltması 'ng g c <isim>' şeklindedir.", difficulty: E, points: 5, tags: ['angular', 'cli'], outcomeIds: [100], examId: 1 },
  { questionText: "Angular'da two-way binding hangi direktif ile yapılır?", type: MC, options: ['ngModel', 'ngBind', 'ngTwoWay', 'ngCopy'], correctAnswer: 0, solution: 'Two-way binding için [(ngModel)] direktifi kullanılır. Bu, FormsModule\'ün sağladığı bir direktiftir ve hem veri akışını hem de kullanıcı girdisini eşzamanlı olarak yönetir.', difficulty: M, points: 10, tags: ['angular', 'binding'], outcomeIds: [101], examId: 1 },
  { questionText: "RxJS'te Observable oluşturmak için hangi yöntem kullanılır?", type: MC, options: ['create() fonksiyonu', 'of() fonksiyonu', 'new Observable()', 'Hepsi'], correctAnswer: 3, solution: 'Observable oluşturmak için create(), of(), from(), new Observable() gibi birden fazla yöntem vardır. Hepsi geçerli yöntemlerdir.', difficulty: H, points: 15, tags: ['rxjs', 'observable'], outcomeIds: [102], examId: 1 },
  { questionText: "Angular'da Pipe nedir, kısaca açıklayınız.", type: SA, options: [], correctAnswer: 'dönüştürme,biçimlendirme,veri', solution: 'Pipe, Angular\'da veriyi görünümde dönüştürmek ve biçimlendirmek için kullanılan bir mekanizmadır. Örn: {{ tarih | date }}', difficulty: E, points: 5, tags: ['angular', 'pipe'], outcomeIds: [101], examId: 1 },
  { questionText: "Angular'da Dependency Injection mekanizmasını ayrıntılı açıklayınız.", type: ES, options: [], correctAnswer: 0, solution: 'DI, Angular\'ın temel yapı taşlarından biridir. Servisler @Injectable() ile işaretlenir ve constructor üzerinden enjekte edilir. Angular\'ın injector hiyerarşisi sayesinde servisler singleton veya modül/component seviyesinde oluşturulabilir.', difficulty: M, points: 10, tags: ['angular', 'di'], outcomeIds: [102], examId: 1 },
  { questionText: 'Angular standalone component mimarisi önerilir mi?', type: TF, options: ['Doğru', 'Yanlış'], correctAnswer: 0, solution: 'Angular 15+ ile standalone component\'ler önerilen yaklaşımdır. NgModule\'lere olan bağımlılığı azaltır ve lazy loading\'i kolaylaştırır.', difficulty: M, points: 5, tags: ['angular', 'standalone'], outcomeIds: [103], examId: 1 },

  // Sınav 2: RxJS Ara Sınav
  { questionText: "RxJS'te Subject nedir?", type: MC, options: ['Observable ve Observer', 'Promise türü', 'Event emitter', 'Veri deposu'], correctAnswer: 0, solution: 'Subject, hem Observable (veri yayınlayabilir) hem de Observer (veri alabilir) özelliklerine sahip özel bir RxJS türüdür. Multicast yayın yapar.', difficulty: M, points: 10, tags: ['rxjs', 'subject'], outcomeIds: [106], examId: 2 },
  { questionText: "RxJS'te hangi operatör veriyi dönüştürür?", type: MC, options: ['map', 'filter', 'reduce', 'take'], correctAnswer: 0, solution: 'map operatörü, Observable\'dan gelen her değeri bir dönüşüm fonksiyonundan geçirerek yeni bir Observable oluşturur.', difficulty: E, points: 5, tags: ['rxjs', 'operators'], outcomeIds: [106], examId: 2 },

  // Sınav 3: TypeScript Final
  { questionText: "TypeScript'te tip tanımlamak için hangi anahtar kelime kullanılır?", type: MC, options: ['type', 'interface', 'class', 'typedef'], correctAnswer: 1, solution: 'TypeScript\'te tip tanımlamak için interface anahtar kelimesi kullanılır. type da benzer şekilde kullanılabilir ancak interface genişletilebilirlik açısından tercih edilir.', difficulty: E, points: 5, tags: ['typescript', 'interface'], outcomeIds: [109], examId: 3 },
  { questionText: 'Generic fonksiyon nasıl tanımlanır?', type: MC, options: ['func<T>()', 'function<T>()', '<T> function()', 'generic function()'], correctAnswer: 1, solution: 'Generic fonksiyon function<T>(param: T): T şeklinde tanımlanır. T tip parametresi fonksiyonun çağrıldığı anda belirlenir.', difficulty: M, points: 10, tags: ['typescript', 'generics'], outcomeIds: [109], examId: 3 },
  { questionText: "TypeScript'te Union Type nasıl tanımlanır?", type: MC, options: ['string', 'string | number', 'string & number', 'string[]'], correctAnswer: 1, solution: 'Union type, | operatörü ile tanımlanır: string | number. Bir değişkenin birden fazla tipte değer alabileceğini belirtir.', difficulty: M, points: 10, tags: ['typescript', 'union'], outcomeIds: [109], examId: 3 },
  { questionText: 'TypeScript Enum kullanımı hangi durumda tercih edilir?', type: MC, options: ['Sabit değerler için', 'Dinamik değerler için', 'Fonksiyonlar için', 'Sınıflar için'], correctAnswer: 0, solution: 'Enum, sabit değer kümelerini isimlendirmek için kullanılır. Örn: yönler, renkler, durum kodları gibi sınırlı değer kümeleri.', difficulty: E, points: 5, tags: ['typescript', 'enum'], outcomeIds: [109], examId: 3 },

  // Sınav 4: Tailwind CSS Ara Sınav
  { questionText: "Tailwind CSS'te flexbox için hangi class kullanılır?", type: MC, options: ['flex', 'grid', 'block', 'inline'], correctAnswer: 0, solution: 'Tailwind\'de flexbox düzeni için flex class\'ı kullanılır. Alt öğeler otomatik olarak flex item haline gelir.', difficulty: E, points: 5, tags: ['tailwind', 'flexbox'], outcomeIds: [114], examId: 4 },
  { questionText: "Tailwind CSS'te renk belirtmek için hangi class kullanılır?", type: MC, options: ['text-blue-500', 'color-blue', 'font-blue', 'bg-blue'], correctAnswer: 0, solution: 'Tailwind\'de metin rengi text-{renk}-{ton} formatında belirtilir. Örn: text-blue-500, text-red-700.', difficulty: E, points: 5, tags: ['tailwind', 'colors'], outcomeIds: [114], examId: 4 },

  // Sınav 5: Node.js Final
  { questionText: 'Node.js hangi JavaScript motorunu kullanır?', type: MC, options: ['V8', 'SpiderMonkey', 'JavaScriptCore', 'Chakra'], correctAnswer: 0, solution: 'Node.js, Google Chrome\'un V8 JavaScript motorunu kullanır. Bu sayede yüksek performanslı sunucu tarafı JavaScript çalıştırma imkanı sağlar.', difficulty: E, points: 5, tags: ['nodejs', 'v8'], outcomeIds: [111], examId: 5 },
  { questionText: "Express.js'te route parametresi nasıl tanımlanır?", type: MC, options: ['/users/:id', '/users/{id}', '/users/<id>', '/users#[id]'], correctAnswer: 0, solution: 'Express.js\'te route parametreleri :parametreAdı formatında tanımlanır. req.params üzerinden erişilir.', difficulty: M, points: 10, tags: ['express', 'routing'], outcomeIds: [112], examId: 5 },
  { questionText: 'Node.js modül dışa aktarmak için hangi anahtar kelime kullanılır?', type: MC, options: ['module.exports', 'import', 'require', 'export'], correctAnswer: 0, solution: 'CommonJS modül sisteminde module.exports ile dışa aktarım yapılır. ES6\'da export kullanılır ancak Node.js geleneksel olarak CommonJS kullanır.', difficulty: E, points: 5, tags: ['nodejs', 'modules'], outcomeIds: [111], examId: 5 },
  { questionText: "Express.js'te middleware nedir?", type: MC, options: ['İstek-cevap döngüsünde çalışan fonksiyon', 'Veritabanı bağlantısı', 'Route tanımı', 'Hata yönetimi'], correctAnswer: 0, solution: 'Middleware, istek-cevap döngüsünde çalışan ve req, res, next parametrelerine erişimi olan fonksiyonlardır. Kimlik doğrulama, loglama, hata yakalama gibi işlemler için kullanılır.', difficulty: M, points: 10, tags: ['express', 'middleware'], outcomeIds: [112], examId: 5 },

  // Sınav 6: React vs Angular Değerlendirme
  { questionText: "Angular'da state yönetimi için hangi kütüphane kullanılır?", type: MC, options: ['NgRx', 'Redux', 'MobX', 'Vuex'], correctAnswer: 0, solution: 'NgRx, Angular için özel olarak geliştirilmiş, Redux pattern\'ini temel alan bir state yönetim kütüphanesidir.', difficulty: M, points: 10, tags: ['angular', 'state'], outcomeIds: [113], examId: 6 },
  { questionText: "React'te component state'i hangi hook ile yönetilir?", type: MC, options: ['useState', 'useEffect', 'useReducer', 'useMemo'], correctAnswer: 0, solution: 'useState hook\'u React functional component\'lerde state yönetimi için kullanılır. [state, setState] şeklinde bir dizi döndürür.', difficulty: E, points: 5, tags: ['react', 'hooks'], outcomeIds: [113], examId: 6 },
  { questionText: "React'te JSX nedir?", type: MC, options: ['JS içinde HTML benzeri sözdizimi', 'JavaScript kütüphanesi', 'State yönetim aracı', 'Build aracı'], correctAnswer: 0, solution: 'JSX, JavaScript içinde HTML benzeri sözdizimi yazmayı sağlayan bir eklentidir. Babel ile derlenerek React.createElement() çağrılarına dönüştürülür.', difficulty: E, points: 5, tags: ['react', 'jsx'], outcomeIds: [113], examId: 6 },
  { questionText: "Angular'da Signal nedir?", type: MC, options: ['Reaktif state yönetimi', 'HTTP isteği', 'Pipe türü', 'Guard türü'], correctAnswer: 0, solution: 'Signal, Angular 16+ ile gelen reaktif state yönetim aracıdır. Değişiklikleri otomatik algılar ve granular re-render sağlar.', difficulty: M, points: 10, tags: ['angular', 'signal'], outcomeIds: [113], examId: 6 },

  // Sınav 7: Angular Temelleri Ara Sınav
  { questionText: "Angular'da @Input dekoratörü ne işe yarar?", type: MC, options: ["Parent'tan child'a veri aktarır", "Child'tan parent'a veri aktarır", 'Servis enjekte eder', 'Pipe tanımlar'], correctAnswer: 0, solution: '@Input dekoratörü, parent component\'ten child component\'e veri aktarımı sağlar. Property binding [prop]="value" ile kullanılır.', difficulty: E, points: 5, tags: ['angular', 'input'], outcomeIds: [103], examId: 7 },
  { questionText: 'Angular Routing wildcard route nasıl tanımlanır?', type: MC, options: ['**', '*', '/*', '?'], correctAnswer: 0, solution: 'Wildcard route ** ile tanımlanır ve eşleşmeyen tüm URL\'leri yakalar. 404 sayfası veya yönlendirme için kullanılır.', difficulty: M, points: 10, tags: ['angular', 'routing'], outcomeIds: [103], examId: 7 },
];
