import UIKit

/// 场景代理
/// Scene Delegate - 管理窗口场景
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        // 创建窗口
        window = UIWindow(windowScene: windowScene)
        
        // 设置根视图控制器
        let viewController = ViewController()
        window?.rootViewController = UINavigationController(rootViewController: viewController)
        window?.makeKeyAndVisible()
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // 场景断开连接
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // 场景变为活跃状态
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // 场景即将进入非活跃状态
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // 场景即将进入前台
        if let viewController = window?.rootViewController as? ViewController {
            viewController.onResume()
        }
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // 场景进入后台
        if let viewController = window?.rootViewController as? ViewController {
            viewController.onPause()
        }
    }
}
