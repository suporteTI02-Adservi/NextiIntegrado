Redesenhe os indicadores/cards de status utilizando glassmorphism, mantendo a estética escura, sofisticada e tecnológica do restante da aplicação.

Cada indicador deve possuir 60x60px e aparência de vidro translúcido.

ESTRUTURA VISUAL

- Dimensões: 60px x 60px.
- Border-radius entre 12px e 16px.
- Fundo escuro semitransparente.
- Utilizar backdrop-filter: blur() para produzir efeito de vidro.
- Adicionar uma borda fina e translúcida.
- Utilizar sombras internas e externas extremamente suaves para criar profundidade.
- O componente não deve parecer um botão sólido.
- Manter o centro predominantemente escuro/transparente.

GRADIENTE DE STATUS

A cor correspondente ao status NÃO deve preencher o card inteiro.

Ela deve aparecer principalmente em aproximadamente 1/6 da superfície do card, partindo de um dos cantos e avançando diagonalmente para dentro do componente.

O efeito deve lembrar luz colorida atravessando a borda de uma peça de vidro.

A transição precisa ser suave:
cor mais intensa próxima ao canto/borda -> cor translúcida -> transparente.

Não criar uma divisão diagonal dura.
Não deve parecer que 1/6 do card simplesmente recebeu uma cor sólida.
Utilize radial-gradient, linear-gradient ou combinação dos dois para produzir uma iluminação difusa.

STATUS

1. SUCESSO
- Cor principal: verde-lima suave.
- Evitar verde neon excessivamente saturado.
- O canto do vidro recebe um brilho verde-lima translúcido.
- Ícone central: check.
- O ícone pode possuir um glow verde extremamente discreto.

2. PROCESSANDO
- Cor principal: azul-céu suave.
- O canto do vidro recebe iluminação azul translúcida.
- Ícone central: spinner/loading.
- O spinner deve possuir uma animação suave e contínua.
- O brilho azul pode pulsar muito lentamente enquanto estiver processando.

3. ERRO
- Cor principal: vermelho suave.
- Evitar vermelho extremamente saturado.
- O canto do vidro recebe iluminação vermelha translúcida.
- Ícone central: X ou símbolo de erro.
- Glow vermelho discreto, sem animação agressiva.

EFEITO DE VIDRO

Quero que seja perceptível que a cor está interagindo com um material transparente.

Utilize:
- backdrop blur;
- transparência;
- highlights nas bordas;
- reflexo interno sutil;
- sombra interna;
- pequena iluminação colorida;
- gradiente parcialmente transparente.

A borda próxima à região colorida pode assumir levemente a cor correspondente ao status.

As demais bordas devem permanecer em cinza/azul muito escuro e translúcido.

ANIMAÇÕES

Hover:
- aumentar muito levemente o brilho;
- aumentar discretamente a transparência/reflexo da borda;
- scale máximo de aproximadamente 1.03.

Processando:
- spinner girando;
- iluminação azul respirando muito lentamente.

Sucesso:
- opcionalmente animar o check apenas quando o status mudar para sucesso.

Erro:
- evitar animações repetitivas ou piscantes.

IMPORTANTE

O resultado deve ser sofisticado e discreto.

NÃO quero:
- cards inteiramente verdes, azuis ou vermelhos;
- gradientes extremamente saturados;
- aparência neon/cyberpunk;
- bordas excessivamente brilhantes;
- sombras pesadas;
- divisão diagonal claramente marcada.

A referência visual é:
"uma pequena placa de vidro escuro sendo iluminada diagonalmente por uma fonte de luz colorida posicionada em um dos cantos".

O efeito colorido deve ocupar visualmente aproximadamente 1/6 do card e desaparecer progressivamente no restante do vidro.

Implemente isso como um componente reutilizável de StatusCard, recebendo o status como propriedade:

success
processing
error

A aparência e animação devem ser determinadas automaticamente pelo status.