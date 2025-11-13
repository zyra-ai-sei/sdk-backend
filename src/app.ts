import express, { Application, NextFunction, Request, Response, Router } from 'express';
import cors from 'cors';
import { InversifyExpressServer } from 'inversify-express-utils'
import { Container } from 'inversify';
import env from './envConfig'
import container from './ioc-container/ioc.config';
import mongoose from 'mongoose'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { responseFormatter } from './middleware/ResponseFormatter';
import { Server as SocketServer } from 'socket.io'
import OpenAI from 'openai';

class ArrowServer {

  private readonly port: string | number
  public app: Application;
  public readonly server: InversifyExpressServer;
  private io: SocketServer
  private httpServer: http.Server
  private openai: OpenAI
  /**
   * 
   * @param container - The Inversify container for dependency injection
   */
  constructor(container: Container) {
    // const expressApp = http2Express(express);
    this.server = new InversifyExpressServer(container, null, {
      rootPath: '/v1',
    })
    this.server.setConfig(app => {
      app.use(express.json())
      app.use(cors())
      app.use(function (req: Request, res: Response, next: NextFunction) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE'
        )
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Access-Control-Allow-Credentials', 'true')

        next()
      })
      app.use(/\/((?!webhooks).)*/, responseFormatter)

    })
    this.app = this.server.build()
    // this.app.use(errorHandler)
    this.port = env.PORT

    // Create HTTP server
    this.httpServer = http.createServer(this.app);

    this.openai = new OpenAI({
      baseURL:'https://openrouter.ai/api/v1',
      apiKey:'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'
    })

    // Initialize Socket.IO
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports:['polling','websocket']
    })

    this.io.on('connection', (socket) => {
      console.log('Client connected');

      socket.on('newchat', (message) => {
        console.log('Received message:', message);
        const completion = this.openai.chat.completions.create({
          messages:[{role:'system', content:message}],
          model:'deepseek/deepseek-r1:free',
        }).then((completion)=>{
          socket.emit(completion.choices[0].message.content)
        })
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected')
      })
    })


    // const options = {
    //   key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
    //   cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem')),
    //   ALPNProtocols: ['h2', 'http/1.1']  // Explicitly specify HTTP/2 and HTTP/1.1
    // };

    // const http2Server = http2.createSecureServer(options, expressApp)

    // http2Server.listen(this.port, () => {
    //   console.log(`HTTP/2 server is listening on port ${this.port}`);
    // });
  }


  public getIO(): SocketServer {
    return this.io;
  }

  private async setup(): Promise<void> {
    try {
      await mongoose.connect(env.MONGO_URI)
      console.log('mongoose connected successfully')
    } catch (err) {
      throw new Error('error in connecting to mongoDB')
    }
  }

  public async start(): Promise<void> {
    await this.setup()
    this.httpServer.listen(this.port, () => {
      console.log(`server is listening on port ${this.port}`)
    })
  }
}

const arrowServer = new ArrowServer(container);
arrowServer.start()

arrowServer.app.get('/', (req, res) => {
  res.send('Hello World');
});

arrowServer.app.emit('new2chat','hi there')

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} signal received: closing HTTP server and database connections`);
  try {
    // Import TYPES to get the correct symbol
    const { TYPES } = await import('./ioc-container/types');
    const llmService = container.get<any>(TYPES.LlmService);
    if (llmService && typeof llmService.dispose === 'function') {
      await llmService.dispose();
    }
    await mongoose.connection.close();
    console.log('Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));



