import { ColorSwatch, Group, Loader } from "@mantine/core";
import axios from "axios";
import { Button } from "../ui/Button";
import { useEffect, useRef, useState } from "react";

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

interface GenerateResult {
  expression: string;
  answer: string;
}

const penColors = [
  "#000000", "#ffffff", "#ee3333", "#e64980", "#be4bdb", "#893200",
  "#228be6", "#3333ee", "#40c057", "#00aa00", "#fab005", "#fd7e14",
];

const Home = () => {
  const canvaRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState<string>("rgb(255,255,255)");
  const [reset, setReset] = useState(false);
  const [result, setResult] = useState<GenerateResult>();
  const [dictOfVars, setDictOfVars] = useState({});
  const [latexExpr, setLatexExpr] = useState<Array<string>>([]);
  const [latexPos, setLatexPos] = useState({ x: 10, y: 200 });

  const [loading, setLoading] = useState(false);

  const sendData = async () => {
    setLoading(true);
    try {
      const canvas = canvaRef.current;

      if (canvas) {
        const response = await axios({
          method: "POST",
          url: `${import.meta.env.VITE_API_URL}/calculate`,
          data: {
            image: canvas.toDataURL('image/png'),
            dict_of_vars: dictOfVars,
          },
        });
        const resp = await response.data;

        resp.data.forEach((res: Response) => {
          if (res.assign === true) {
            setDictOfVars({ ...dictOfVars, [res.expr]: res.result });
          }
        });

        const ctx = canvas.getContext("2d");
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (imageData?.data[i] !== 0) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setLatexPos({ x: centerX, y: centerY });

        resp.data.forEach((res: Response) => {
          setTimeout(() => {
            setResult({ expression: res.expr, answer: res.result });
          }, 0);
        });
      }
    } catch (error) {
      console.error("Error sending data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result) {
      renderLatex(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpr([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
      }
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/config/TeX-MML-AM_CHTML.js";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.MathJax) {
        window.MathJax.Hub.Config({
          tex2jax: { inlineMath: [["$", "$"], ['\\(', '\\)']] },
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (latexExpr.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpr]);

  const renderLatex = (expr: string, result: string) => {
    const latex = `${expr} = ${result}`;
    setLatexExpr([...latexExpr, latex]);
    const canvas = canvaRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "30px Arial";
        ctx.fillStyle = "white";

        const textMetrics = ctx.measureText(latex);
        const textWidth = textMetrics.width;

        const maxWidth = window.innerWidth * 0.7;

        const leftMargin = window.innerWidth * 0.2;

        const x = Math.max(
          leftMargin,
          Math.min(
            canvas.width - textWidth - 10,
            leftMargin + (maxWidth - textWidth) / 2
          )
        );

        const y = Math.min(
          canvas.height - 20,
          latexPos.y
        );

        if (latex.length === 0) {
          ctx.fillText("Sorry can't guess what you have drawn. Please try again..", x, y);
        }

        ctx.fillText(latex, x, y);

        const newY = y + 50;
        setLatexPos({
          x: x,
          y: newY > canvas.height - 50 ? 50 : newY
        });
      }
    }
  };

  const resetCanvas = () => {
    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvaRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };

  return (
    <>
      <div className="absolute top-[2%] left-2.5 w-full h-full bg-amber-50">
        <div style={{ padding: '20px' }} className="flex items-center rounded-4xl bg-zinc-600 flex-col gap-3 justify-center p-8 absolute z-10 h-[96vh] w-[20vw]">

          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Group style={{ padding: '10px' }} className="p-5 w-[full] flex justify-center items-center">
              {
                penColors.map((color: string, index: number) => (
                  <ColorSwatch
                    component="button"
                    className="cursor-pointer hover:outline-2 hover:outline-amber-500 transition-all duration-100"
                    key={index}
                    color={color}
                    onClick={() => setColor(color)}
                  />
                ))
              }
            </Group>
          </div>

          <div style={{ marginTop: '40px' }} className="z-20 flex ml-2.5 gap-3 mt-28 justify-center">
            <Button
              variant="destructive"
              size="default"
              className="bg-rose-600 text-white hover:bg-rose-700 font-semibold"
              onClick={() => setReset(true)}
            >
              Clear
            </Button>
            <Button
              variant="secondary"
              size="default"
              className="bg-emerald-500 text-black hover:bg-emerald-800"
              onClick={sendData}
              disabled={loading}
            >
              Generate
            </Button>
          </div>
          {loading && <Loader color="yellow" />} {/* Show the loader while loading */}
        </div>
      </div>
      <canvas
        ref={canvaRef}
        id="canvas"
        className="absolute bg-zinc-900 top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseUp={() => setIsDrawing(false)}
        onMouseMove={draw}
      />

      {latexPos && latexExpr.map((_, index) => (
        <div key={index} className="absolute z-50 text-white">
          {/* This div would contain any LaTeX rendered content */}
        </div>
      ))}
    </>
  );
};

export default Home;
