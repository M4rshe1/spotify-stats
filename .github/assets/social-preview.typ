#let width = 640pt
#let height = 320pt

// Colors from the image
#let bg-dark = rgb("#111111")
#let bg-gradient-start = rgb("#2a2a2a")
#let card-bg = rgb("#1a1a1a").lighten(5%)
#let success = rgb("#18a97e")
#let destructive = rgb("#f0636b")
#let muted = rgb("#97a1a8")

#set page(width: width, height: height, margin: 0pt)
#set text(font: "JetBrains Mono", fill: white, size: 10pt)

#let data-card = (title, value, desc) => [
  #let moreLess = if (desc > 0) { "more" } else { "less" }
  #let descColor = if (desc > 0) { success } else { destructive }
  #rect(width: 130pt, height: 75pt, fill: card-bg, stroke: gray.darken(50%), radius: 4pt, inset: 10pt)[
    #align(top + left)[
      #text(title, fill: muted, size: 12pt) \
      #v(10pt, weak: true)
      #text(value, size: 18pt, weight: "bold")
    ]
    #align(bottom + right)[
      #text(str(calc.abs(desc)) + "% " + moreLess, fill: descColor, size: 10pt, weight: "bold")
    ]
  ]
]

#box(fill: gradient.radial(bg-gradient-start, bg-dark, center: (30%, 30%), radius: 100%), width: width, height: height)[

  #place(top + left, dx: -10pt, dy: 10pt)[
    #image("./wave-50.png", width: 330pt)
  ]

  #place(top + left, dx: 30pt, dy: 30pt)[
    #stack(
      dir: ltr,
      spacing: 15pt,
      image("../../public/wave-dark.png", width: 50pt, height: 50pt),
      box[
        #v(15pt)
        #text("Spotify Stats", size: 22pt, weight: "bold") \
        #text("Your listening companion", fill: muted.lighten(50%), size: 10pt, weight: "bold")

      ],
    )
  ]

  #place(horizon + right, dx: -20pt, dy: 20pt)[
    #stack(
      dir: ltr,
      spacing: 15pt,
      data-card("Total Tracks", "167,195", 56),
      data-card("Time Listened", "427.6K min", -12),
      data-card("Unique Artists", "2,691", 10),
    )
  ]

  #place(bottom + right, dx: -20pt, dy: -80pt)[
    #text("SELF-HOSTED | YOUR DATA | YOUR STATS", size: 16pt, weight: "medium")
  ]

  #place(bottom + right, dx: -20pt, dy: -20pt)[
    #set align(right)
    #text("Spotify Stats", fill: muted, size: 8pt) \
    #text("© Colin Heggli aka. M4rshe1", fill: muted, size: 8pt)
  ]
]
